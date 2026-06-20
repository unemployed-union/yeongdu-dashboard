// components/DeskDisplay.tsx
"use client";

import dynamic from "next/dynamic";

import { FlipClockScreen } from "./FlipClockScreen";
import { WeatherScreen } from "./WeatherScreen";
import { useEffect, useRef } from "react";

const CalendarScreen = dynamic(
  () =>
    import("./CalendarScreen").then(
      (module) => module.CalendarScreen,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-neutral-950 text-neutral-400">
        달력을 불러오는 중입니다.
      </div>
    ),
  },
);

export function DeskDisplay() {
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const slider = sliderRef.current;

    if (!slider) {
      return;
    }

    /*
     * 첫 번째 슬라이드는 날씨이고,
     * 두 번째 슬라이드인 시계를 처음 화면으로 표시합니다.
     */
    const moveToClock = () => {
      slider.scrollTo({
        left: slider.clientWidth,
        behavior: "auto",
      });
    };

    const frameId = window.requestAnimationFrame(moveToClock);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <main className="h-dvh w-dvw overflow-hidden bg-neutral-950">
      <div
        ref={sliderRef}
        className="
          flex h-full w-full
          snap-x snap-mandatory
          overflow-x-auto overflow-y-hidden
          overscroll-x-contain
          scroll-smooth
          touch-pan-x
          [scrollbar-width:none]
          [&::-webkit-scrollbar]:hidden
        "
      >
        {/* 시계에서 오른쪽으로 밀면 나타남 */}
        <section className="h-full w-full shrink-0 snap-start snap-always">
          <WeatherScreen />
        </section>

        {/* 처음 표시되는 기본 화면 */}
        <section className="h-full w-full shrink-0 snap-start snap-always">
          <FlipClockScreen />
        </section>

        {/* 시계에서 왼쪽으로 밀면 나타남 */}
        <section className="h-full w-full shrink-0 snap-start snap-always">
          <CalendarScreen />
        </section>
      </div>
    </main>
  );
}