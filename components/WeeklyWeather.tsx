// components/WeeklyWeather.tsx

"use client";

import { useQuery } from "@tanstack/react-query";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import {
  getWeatherIconCode,
  getWeatherIconCodeFromKma,
} from "@/lib/weather/get-weather-icon-code";

interface DailyWeather {
  date: string;
  weekday: string;
  minTemperature: number | null;
  maxTemperature: number | null;
  morningCondition: string | null;
  afternoonCondition: string | null;
  morningRainProbability: number | null;
  afternoonRainProbability: number | null;
  condition: string | null;
  rainProbability: number | null;
  source: "short" | "mid" | "merged" | "none";
}

interface WeeklyWeatherResponse {
  location: string;
  generatedAt: string;
  forecasts: DailyWeather[];
  warnings: string[];
}

async function fetchWeeklyWeather(): Promise<WeeklyWeatherResponse> {
  const response = await fetch("/api/weather/weekly", {
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;

    throw new Error(errorBody?.message ?? "주간 날씨를 불러오지 못했습니다.");
  }

  return response.json() as Promise<WeeklyWeatherResponse>;
}

function getMonthDay(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00+09:00`);

  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
  }).format(date);
}

function Temperature({ value }: { value: number | null }) {
  return <>{value === null ? "--" : Math.round(value)}°</>;
}

export function WeeklyWeather() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["weather", "weekly"],
    queryFn: fetchWeeklyWeather,

    // 30분 동안 기존 값을 신선한 데이터로 취급
    staleTime: 30 * 60 * 1000,

    // 화면을 계속 켜두는 경우 30분마다 갱신
    refetchInterval: 30 * 60 * 1000,

    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  if (isPending) {
    return (
      <div className="flex min-h-44 items-center justify-center text-neutral-500">
        주간 날씨를 불러오는 중입니다.
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-44 flex-col items-center justify-center gap-2 text-neutral-400">
        <p>주간 날씨를 불러오지 못했습니다.</p>
        <p className="text-sm text-red-400">{error.message}</p>
      </div>
    );
  }

  return (
    <section className="w-full">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-100">주간 날씨</h2>

          <p className="mt-1 text-sm text-neutral-500">{data.location}</p>
        </div>

        <p className="text-xs text-neutral-600">출처: 기상청</p>
      </div>

      <div className="grid grid-cols-7 gap-2 md:gap-3">
        {data.forecasts.map((forecast, index) => {
          const iconCode = getWeatherIconCode(forecast.condition);

          return (
            <article
              key={forecast.date}
              className={[
                "flex min-w-0 flex-col items-center rounded-2xl",
                "border border-white/5 bg-white/[0.04]",
                "px-2 py-4 md:px-3",
                index === 0 ? "ring-1 ring-white/20" : "",
              ].join(" ")}
            >
              <p
                className={
                  index === 0
                    ? "font-semibold text-neutral-100"
                    : "text-neutral-400"
                }
              >
                {index === 0 ? "오늘" : forecast.weekday}
              </p>

              <p className="mt-1 text-xs text-neutral-600">
                {getMonthDay(forecast.date)}
              </p>

              <WeatherIcon
                code={iconCode}
                isDaytime
                size={56}
                ariaLabel={forecast.condition ?? "날씨 정보 없음"}
                className="my-2 shrink-0"
              />

              <p className="max-w-full truncate text-sm text-neutral-300">
                {forecast.condition ?? "정보 없음"}
              </p>

              <p className="mt-3 whitespace-nowrap text-sm">
                <span className="font-semibold text-neutral-100">
                  <Temperature value={forecast.maxTemperature} />
                </span>

                <span className="ml-2 text-neutral-500">
                  <Temperature value={forecast.minTemperature} />
                </span>
              </p>

              {forecast.rainProbability !== null && (
                <p className="mt-2 text-xs text-sky-300">
                  강수 {forecast.rainProbability}%
                </p>
              )}
            </article>
          );
        })}
      </div>

      {data.warnings.length > 0 && (
        <p className="mt-3 text-xs text-amber-400/70">
          일부 예보 자료를 가져오지 못해 표시 정보가 제한될 수 있습니다.
        </p>
      )}
    </section>
  );
}
