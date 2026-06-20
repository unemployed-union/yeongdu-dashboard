// components/TodaySchedule.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";

interface TodayCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string | null;
  allDay: boolean;
}

interface TodayEventsResponse {
  events: TodayCalendarEvent[];
}

async function fetchTodayEvents(): Promise<TodayEventsResponse> {
  const response = await fetch("/api/calendar/today", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("일정 조회에 실패했습니다.");
  }

  return response.json() as Promise<TodayEventsResponse>;
}

function formatEventTime(event: TodayCalendarEvent): string {
  if (event.allDay) {
    return "종일";
  }

  return DateTime.fromISO(event.start)
    .setZone("Asia/Seoul")
    .toFormat("HH:mm");
}

export function TodaySchedule() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["google-calendar", "today"],
    queryFn: fetchTodayEvents,

    // 5분마다 일정 새로고침
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchIntervalInBackground: true
  });

  if (isPending) {
    return (
      <p className="text-neutral-500 text-center text-2xl">
        오늘 일정을 불러오는 중입니다.
      </p>
    );
  }

  if (isError) {
    return (
      <p className="text-red-400 text-center text-2xl">
        일정을 불러오지 못했습니다.
      </p>
    );
  }

  if (!data.events.length) {
    return (
      <p className="text-neutral-500 text-center text-2xl">
        오늘 예정된 일정이 없습니다.
      </p>
    );
  }

  return (
    <section className="w-full">
      <h2 className="mb-4 text-lg font-semibold text-neutral-400">
        오늘의 일정
      </h2>

      <ul className="space-y-3">
        {data.events.map((event) => (
          <li
            key={event.id}
            className="grid grid-cols-[5rem_1fr] items-center gap-4"
          >
            <time className="font-mono text-xl text-neutral-400">
              {formatEventTime(event)}
            </time>

            <span className="truncate text-2xl text-neutral-100">
              {event.title}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}