// components/FlipClockScreen.tsx
"use client";

import { useEffect, useRef } from "react";

import { CurrentWeatherSummary } from "./CurrentWeatherSummary";
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

      const koreanWeekdayFormatter =
        new Intl.DateTimeFormat("ko-KR", {
          weekday: "long",
          timeZone: "Asia/Seoul",
        });

      const dateInstance = flipClock({
        parent: dateClockRef.current,

        face: clock({
          format: "[YYYY].[MM].[DD] [W]",

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
            fontSize: "clamp(1.4rem, 3vw, 3rem)",
            fontFamily:
              "Pretendard, 'Noto Sans KR', Arial, sans-serif",
            borderRadius: "0.08em",
            animationDuration: "350ms",
          }),
        }),
      });

      const timeInstance = flipClock({
        parent: timeClockRef.current,

        face: clock({
          format: "[hh]:[mm]:[ss]   [A]",
        }),

        theme: theme({
          dividers: [":", " "],

          css: css({
            // 시간 글자 크기는 그대로 유지
            fontSize: "clamp(3.5rem, 9vw, 8rem)",
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
    <section
      className="
        relative h-full w-full
        overflow-hidden bg-neutral-950
        text-white
      "
    >
      {/* 날짜·날씨·시간 전체 영역 */}
      <div
        className="
          absolute left-1/2 top-1/2
          flex w-fit max-w-[calc(100vw-2rem)]
          -translate-x-1/2 -translate-y-[58%]
          flex-col gap-5
        "
      >
        {/* 첫 번째 행: 날짜와 날씨 */}
        <div
          className="
            flex w-full
            items-center justify-between
            gap-8
          "
        >
          <div
            ref={dateClockRef}
            aria-label="오늘 날짜"
            className="
              min-w-0 overflow-hidden

              [&>.flip-clock]:!flex
              [&>.flip-clock]:!w-auto
              [&>.flip-clock]:!items-center
              [&>.flip-clock]:!justify-start

              [&_.flip-clock-group]:!ml-0
              [&_.flip-clock-group]:!mr-0
            "
          />

          <div className="shrink-0">
            <CurrentWeatherSummary />
          </div>
        </div>

        {/* 두 번째 행: 전체 너비를 사용하는 시간 */}
        <div
          ref={timeClockRef}
          aria-label="현재 시각"
          className="
            min-w-0 w-full
            overflow-visible

            [&>.flip-clock]:!flex
            [&>.flip-clock]:!w-full
            [&>.flip-clock]:!max-w-none
            [&>.flip-clock]:!items-center
            [&>.flip-clock]:!justify-between
          "
        />
      </div>

      {/* 하단 오늘 일정 */}
      <div
        className="
          absolute bottom-8 left-1/2
          w-[min(90vw,50rem)]
          -translate-x-1/2
        "
      >
        <TodaySchedule />
      </div>
    </section>
  );
}
