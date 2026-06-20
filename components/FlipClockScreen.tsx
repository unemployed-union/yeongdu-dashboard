// components/FlipClockScreen.tsx
"use client";

import { useEffect, useRef } from "react";
import { TodaySchedule } from "./TodaySchedule";

export function FlipClockScreen() {
  const dateClockRef = useRef<HTMLDivElement>(null);
  const timeClockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    async function initializeClocks() {
      const { clock, css, flipClock, theme } =
        await import("flipclock");

      if (
        disposed ||
        !dateClockRef.current ||
        !timeClockRef.current
      ) {
        return;
      }

      const koreanWeekdayFormatter = new Intl.DateTimeFormat(
        "ko-KR",
        {
          weekday: "long",
        },
      );

      // 위쪽 날짜·요일
      const dateInstance = flipClock({
        parent: dateClockRef.current,

        face: clock({
          format: "[YYYY].[MM].[DD] [DDD]",

          // W라는 사용자 정의 형식 추가
          formatter: {
            formats: {
              W: (date: Date) =>
                koreanWeekdayFormatter.format(date),
            },
          },
        }),

        theme: theme({
          dividers: [".", " "],

          css: css({
            fontSize: "clamp(1.5rem, 4vw, 4rem)",
            fontFamily:
              "Pretendard, 'Noto Sans KR', Arial, sans-serif",
            borderRadius: "0.08em",
            animationDuration: "350ms",
          }),
        }),
      });

      // 가운데 시간
      const timeInstance = flipClock({
        parent: timeClockRef.current,

        face: clock({
          format: "[hh]:[mm]:[ss]   [A]",
        }),

        theme: theme({
          dividers: [":", " "],

          css: css({
            fontSize: "clamp(3rem, 11vw, 10rem)",
            fontFamily: "Arial, sans-serif",
            borderRadius: "0.08em",
            animationDuration: "350ms",
          }),
        }),
      });

      cleanup = () => {
        dateInstance.unmount();
        timeInstance.unmount();
      };
    }

    void initializeClocks();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return (
    <section className="relative flex h-full w-full items-center justify-center overflow-hidden bg-neutral-950">
      {/* 날짜와 요일 */}
      <div
        ref={dateClockRef}
        aria-label="오늘 날짜"
        className="
          absolute top-[20%]
          flex w-full justify-center
          [&>.flip-clock]:!w-full
          [&>.flip-clock]:!items-center
          [&>.flip-clock]:!justify-center
        "
      />

      {/* 현재 시각 */}
      <div
        ref={timeClockRef}
        aria-label="현재 시각"
        className="
          flex w-full items-center justify-center
          [&>.flip-clock]:!w-full
          [&>.flip-clock]:!items-center
          [&>.flip-clock]:!justify-center
        "
      />

      {/* 오늘 일정 */}
    <div className="absolute bottom-8 left-1/2 w-[min(90vw,50rem)] -translate-x-1/2">
      <TodaySchedule />
    </div>
    </section>
  );
}