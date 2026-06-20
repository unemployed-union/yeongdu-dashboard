"use client";

import { memo, useEffect, useRef } from "react";

import FullCalendar, {
  type CalendarRef,
  type EventInput,
  type EventSourceFuncInfo,
} from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import koLocale from "@fullcalendar/react/locales/ko";
import themePlugin from "@fullcalendar/react/themes/pulse";

const CALENDAR_PLUGINS = [
  themePlugin,
  dayGridPlugin,
];

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string | null;
  allDay: boolean;
}

interface CalendarEventsResponse {
  events: CalendarEvent[];
}

async function fetchGoogleCalendarEvents(
  fetchInfo: EventSourceFuncInfo,
): Promise<EventInput[]> {
  const searchParams = new URLSearchParams({
    start: fetchInfo.startStr,
    end: fetchInfo.endStr,
  });

  const response = await fetch(
    `/api/calendar/events?${searchParams.toString()}`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      "Google Calendar 일정을 불러오지 못했습니다.",
    );
  }

  const data =
    (await response.json()) as CalendarEventsResponse;

  return data.events.map(
    (event): EventInput => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end ?? undefined,
      allDay: event.allDay,
      extendedProps: {
        sourceType: "google-calendar",
      },
    }),
  );
}

function CalendarScreenComponent() {
  const calendarRef =
    useRef<CalendarRef | null>(null);

  useEffect(() => {
    const calendarApi =
      calendarRef.current?.getApi();

    if (!calendarApi) {
      return;
    }

    /*
     * 개발 모드의 Strict Mode에서 Effect가 다시 실행되어도
     * 같은 이벤트 소스가 중복 등록되지 않도록 제거합니다.
     */
    calendarApi
      .getEventSourceById("google-calendar")
      ?.remove();

    calendarApi
      .getEventSourceById("korean-holidays")
      ?.remove();

    calendarApi.addEventSource({
      id: "google-calendar",
      events: fetchGoogleCalendarEvents,
    });

    calendarApi.addEventSource({
      id: "korean-holidays",
      url: "/api/calendar/holidays",
      color: "#991b1b",
      contrastColor: "#fee2e2",
    });

    const timer = window.setInterval(() => {
      calendarApi.refetchEvents();
    }, 5 * 60 * 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return (
    <section className="h-full w-full bg-neutral-950 p-6 text-white">
      <div className="h-full">
        <FullCalendar
          ref={calendarRef}
          plugins={CALENDAR_PLUGINS}
          initialView="dayGridMonth"
          locale={koLocale}
          timeZone="Asia/Seoul"
          colorScheme="dark"
          height="100%"
          expandRows
          fixedWeekCount={false}
          showNonCurrentDates={false}
          dayMaxEvents={3}
          dayCellTopContent={(info) =>
            String(info.date.getDate())
          }
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "",
          }}
          eventTimeFormat={{
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }}
          eventSourceFailure={(error) => {
            console.error(
              "캘린더 이벤트 조회 실패:",
              error,
            );
          }}
        />
      </div>
    </section>
  );
}

export const CalendarScreen = memo(
  CalendarScreenComponent,
);