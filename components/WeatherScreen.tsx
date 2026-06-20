"use client";

import { useQuery } from "@tanstack/react-query";
import {
  WiCloudy,
  WiDaySunny,
  WiHumidity,
  WiNightClear,
  WiRain,
  WiRainMix,
  WiSnow,
  WiStrongWind,
} from "react-icons/wi";

import { toFiniteNumber } from "@/lib/util";

import { WeeklyWeather } from "./WeeklyWeather";
import { HourlyWeather } from "./HourlyWeather";

interface WeatherData {
  location: string;
  forecastAt: string;
  temperature: number | null;
  humidity: number | null;
  windSpeed: number | null;
  precipitation: string | null;
  sky: number;
  precipitationType: number;
  description: string;
}

async function fetchWeather(): Promise<WeatherData> {
  const response = await fetch("/api/weather", {
    cache: "no-store",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;

    throw new Error(body?.message ?? "날씨 조회에 실패했습니다.");
  }

  return response.json() as Promise<WeatherData>;
}

function WeatherIcon({
  sky,
  precipitationType,
}: {
  sky: number;
  precipitationType: number;
}) {
  const hour = new Date().getHours();
  const isNight = hour < 6 || hour >= 19;
  const className = "h-40 w-40 md:h-56 md:w-56";

  if ([1, 5].includes(precipitationType)) {
    return <WiRain className={className} />;
  }

  if ([2, 6].includes(precipitationType)) {
    return <WiRainMix className={className} />;
  }

  if ([3, 7].includes(precipitationType)) {
    return <WiSnow className={className} />;
  }

  if (sky === 1) {
    return isNight ? (
      <WiNightClear className={className} />
    ) : (
      <WiDaySunny className={className} />
    );
  }

  return <WiCloudy className={className} />;
}

export function WeatherScreen() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["kma-weather"],
    queryFn: fetchWeather,

    // 10분마다 새 데이터 확인
    refetchInterval: 10 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  if (isPending) {
    return (
      <section className="flex h-full w-full items-center justify-center bg-neutral-950 text-neutral-400">
        날씨를 불러오는 중입니다.
      </section>
    );
  }

  if (isError) {
    return (
      <section className="flex h-full w-full flex-col items-center justify-center gap-4 bg-neutral-950 text-neutral-400">
        <p>날씨를 불러오지 못했습니다.</p>
        <p className="text-sm text-red-400">{error.message}</p>
      </section>
    );
  }

  return (
    <section
      className="
      flex h-full w-full flex-col
      overflow-hidden bg-neutral-950
      px-6 py-5 text-neutral-100
    "
    >
      {/* 현재 날씨 */}
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="flex items-center gap-8 md:gap-14">
          <WeatherIcon
            sky={data.sky}
            precipitationType={data.precipitationType}
          />

          <div>
            <p className="text-[clamp(4rem,11vw,9rem)] font-light leading-none">
              {data.temperature !== null && Number.isFinite(data.temperature)
                ? Math.round(data.temperature)
                : "--"}

              <span className="align-top text-[0.35em]">℃</span>
            </p>

            <p className="mt-3 text-2xl text-neutral-300">{data.description}</p>

            <p className="mt-2 text-sm text-neutral-500">{data.location}</p>
          </div>
        </div>
      </div>

      {/* 앞으로 6시간 */}
      <div className="shrink-0">
        <HourlyWeather />
      </div>

      {/* 일주일 예보 */}
      <div className="mt-4 shrink-0">
        <WeeklyWeather />
      </div>

      <p className="mt-2 shrink-0 text-right text-xs text-neutral-700">
        출처: 기상청
      </p>
    </section>
  );
}
