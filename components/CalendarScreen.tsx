"use client";

import FullCalendar, { type CalendarRef } from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import koLocale from "@fullcalendar/react/locales/ko";
import themePlugin from "@fullcalendar/react/themes/pulse";

import type { EventInput, EventSourceFuncArg } from "@fullcalendar/core";
import { useEffect, useRef } from "react";

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

export function CalendarScreen() {
  const calendarRef = useRef<CalendarRef | null>(null);

  useEffect(() => {
    const timer = window.setInterval(
      () => {
        calendarRef.current?.getApi().refetchEvents();
      },
      5 * 60 * 1000,
    );

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return (
    <section className="h-full w-full bg-neutral-950 p-6 text-white">
      <div className="h-full">
        <FullCalendar
          plugins={[themePlugin, dayGridPlugin]}
          initialView="dayGridMonth"
          locale={koLocale}
          timeZone="Asia/Seoul"
          colorScheme="dark"
          height="100%"
          expandRows
          fixedWeekCount={false}
          showNonCurrentDates={false}
          dayMaxEvents={3}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "",
          }}
          buttons={{
            today: {
              text: "오늘",
              display: "text",
            },
          }}
          eventTimeFormat={{
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }}
          dayCellTopContent={(info) => String(info.date.getDate())}
          events={async (
            fetchInfo: EventSourceFuncArg,
          ): Promise<EventInput[]> => {
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
              throw new Error("달력 일정을 불러오지 못했습니다.");
            }

            const data = (await response.json()) as CalendarEventsResponse;

            return data.events.map((event) => ({
              id: event.id,
              title: event.title,
              start: event.start,
              end: event.end ?? undefined,
              allDay: event.allDay,
            }));
          }}
        />
      </div>
    </section>
  );
}
