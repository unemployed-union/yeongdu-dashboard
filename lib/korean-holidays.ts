import "server-only";

import { DateTime } from "luxon";

const TIME_ZONE = "Asia/Seoul";
const ICS_CACHE_SECONDS = 60 * 60 * 24;

export interface HolidayCalendarEvent {
  id: string;
  title: string;
  start: string;
  allDay: true;
  classNames: string[];
  extendedProps: {
    sourceType: "holiday";
  };
}

interface ParsedHoliday {
  uid: string | null;
  title: string | null;
  date: string | null;
}

/**
 * ICS에서는 한 속성이 다음 줄로 접힐 수 있습니다.
 * 공백이나 탭으로 시작하는 줄을 이전 줄에 이어 붙입니다.
 */
function unfoldIcsLines(ics: string): string {
  return ics
    .replace(/\r\n[ \t]/g, "")
    .replace(/\n[ \t]/g, "");
}

function unescapeIcsText(value: string): string {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function getIcsProperty(
  eventBlock: string,
  propertyName: string,
): string | null {
  const normalizedName = propertyName.toUpperCase();

  for (const line of eventBlock.split(/\r?\n/)) {
    const colonIndex = line.indexOf(":");

    if (colonIndex < 0) {
      continue;
    }

    const propertyPart = line.slice(0, colonIndex);
    const propertyKey = propertyPart
      .split(";")[0]
      .toUpperCase();

    if (propertyKey === normalizedName) {
      return line.slice(colonIndex + 1).trim();
    }
  }

  return null;
}

function formatIcsDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{4})(\d{2})(\d{2})$/);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;

  return `${year}-${month}-${day}`;
}

function parseHolidayEvent(eventBlock: string): ParsedHoliday {
  const uid = getIcsProperty(eventBlock, "UID");
  const summary = getIcsProperty(eventBlock, "SUMMARY");
  const start = getIcsProperty(eventBlock, "DTSTART");

  return {
    uid: uid ? unescapeIcsText(uid) : null,
    title: summary ? unescapeIcsText(summary) : null,
    date: formatIcsDate(start),
  };
}

function parseIcsEvents(ics: string): ParsedHoliday[] {
  const unfolded = unfoldIcsLines(ics);

  const eventBlocks =
    unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];

  return eventBlocks.map(parseHolidayEvent);
}

function parseRange(
  startIso: string,
  endIso: string,
): {
  startDate: string;
  endDate: string;
} {
  const start = DateTime.fromISO(startIso, {
    setZone: true,
  }).setZone(TIME_ZONE);

  const end = DateTime.fromISO(endIso, {
    setZone: true,
  }).setZone(TIME_ZONE);

  if (!start.isValid || !end.isValid) {
    throw new Error("공휴일 조회 날짜 형식이 올바르지 않습니다.");
  }

  if (start.toMillis() >= end.toMillis()) {
    throw new Error(
      "공휴일 조회 종료일은 시작일보다 이후여야 합니다.",
    );
  }

  const startDate = start.toISODate();
  const endDate = end.toISODate();

  if (!startDate || !endDate) {
    throw new Error("공휴일 조회 날짜를 변환하지 못했습니다.");
  }

  return {
    startDate,
    endDate,
  };
}

async function downloadHolidayIcs(): Promise<string> {
  const icsUrl = process.env.HOLIDAY_ICS_URL;

  if (!icsUrl) {
    throw new Error(
      "HOLIDAY_ICS_URL 환경변수가 설정되지 않았습니다.",
    );
  }

  const response = await fetch(icsUrl, {
    headers: {
      Accept: "text/calendar, text/plain;q=0.9, */*;q=0.8",
    },
    next: {
      revalidate: ICS_CACHE_SECONDS,
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(
      `공휴일 ICS 조회에 실패했습니다: ${response.status}`,
    );
  }

  const icsText = await response.text();

  if (!icsText.includes("BEGIN:VCALENDAR")) {
    throw new Error(
      "공휴일 서버가 올바른 ICS 데이터를 반환하지 않았습니다.",
    );
  }

  return icsText;
}

export async function getKoreanHolidayEvents(
  startIso: string,
  endIso: string,
): Promise<HolidayCalendarEvent[]> {
  const { startDate, endDate } = parseRange(startIso, endIso);
  const icsText = await downloadHolidayIcs();

  const parsedEvents = parseIcsEvents(icsText);

  const events = parsedEvents.flatMap(
    (event, index): HolidayCalendarEvent[] => {
      if (!event.date || !event.title) {
        return [];
      }

      // FullCalendar의 end는 포함하지 않는 종료 범위입니다.
      if (event.date < startDate || event.date >= endDate) {
        return [];
      }

      return [
        {
          id: event.uid
            ? `holiday-${event.uid}`
            : `holiday-${event.date}-${index}`,
          title: event.title,
          start: event.date,
          allDay: true,
          classNames: ["holiday-event"],
          extendedProps: {
            sourceType: "holiday",
          },
        },
      ];
    },
  );

  return Array.from(
    new Map(events.map((event) => [event.id, event])).values(),
  ).sort((left, right) =>
    left.start.localeCompare(right.start),
  );
}