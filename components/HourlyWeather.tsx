"use client";

import { useQuery } from "@tanstack/react-query";

import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { getWeatherIconCodeFromKma } from "@/lib/weather/get-weather-icon-code";
import { useEffect, useState } from "react";

interface HourlyWeatherItem {
  forecastAt: string;
  temperature: number | null;
  humidity: number | null;
  windSpeed: number | null;
  precipitationAmount: string | null;
  sky: number;
  precipitationType: number;
  description: string;
}

interface HourlyWeatherResponse {
  location: string;
  baseAt: string;
  forecasts: HourlyWeatherItem[];
}

async function fetchHourlyWeather(): Promise<HourlyWeatherResponse> {
  const response = await fetch("/api/weather/hourly", {
    cache: "no-store",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;

    throw new Error(body?.message ?? "시간별 날씨를 불러오지 못했습니다.");
  }

  return response.json() as Promise<HourlyWeatherResponse>;
}

function isNight(forecastAt: string): boolean {
  const hour = Number(
    new Intl.DateTimeFormat("ko-KR", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Asia/Seoul",
    }).format(new Date(forecastAt)),
  );

  return hour < 6 || hour >= 19;
}

function formatForecastTime(forecastAt: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(new Date(forecastAt));
}

function Temperature({ value }: { value: number | null }) {
  return (
    <>
      {value !== null && Number.isFinite(value)
        ? `${Math.round(value)}°`
        : "--"}
    </>
  );
}

export function HourlyWeather() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 60 * 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const {
    data,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ["weather", "hourly"],
    queryFn: fetchHourlyWeather,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // 먼저 로딩 상태 처리
  if (isPending) {
    return (
      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-40 animate-pulse rounded-2xl bg-white/[0.04]"
          />
        ))}
      </div>
    );
  }

  // 오류 상태 처리
  if (isError) {
    return (
      <p className="text-sm text-red-300">
        {error instanceof Error
          ? error.message
          : "시간별 날씨를 불러오지 못했습니다."}
      </p>
    );
  }

  // 요청은 성공했지만 응답 구조가 이상한 경우
  if (!data || !Array.isArray(data.forecasts)) {
    return (
      <p className="text-sm text-neutral-500">
        표시할 시간별 예보가 없습니다.
      </p>
    );
  }

  const currentHour = new Date(now);
  currentHour.setMinutes(0, 0, 0);

  const visibleForecasts = data.forecasts
    .filter((forecast) => {
      const forecastTime = new Date(
        forecast.forecastAt,
      ).getTime();

      return (
        Number.isFinite(forecastTime) &&
        forecastTime >= currentHour.getTime()
      );
    })
    .slice(0, 6);

  if (visibleForecasts.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        표시할 시간별 예보가 없습니다.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-6 gap-2">
      {visibleForecasts.map((forecast) => {
        const iconCode =
          getWeatherIconCodeFromKma(
            forecast.sky,
            forecast.precipitationType,
          );

        const isDaytime = !isNight(
          forecast.forecastAt,
        );

        return (
          <article
            key={forecast.forecastAt}
            className="
              flex min-w-0 flex-col items-center
              rounded-2xl border border-white/5
              bg-white/[0.04] px-2 py-3
            "
          >
            <time className="text-sm text-neutral-400">
              {formatForecastTime(
                forecast.forecastAt,
              )}
            </time>

            <WeatherIcon
              code={iconCode}
              isDaytime={isDaytime}
              size={48}
              ariaLabel={forecast.description}
              className="my-1 shrink-0"
            />

            <p className="text-xl font-semibold text-neutral-100">
              <Temperature
                value={forecast.temperature}
              />
            </p>

            <p className="mt-1 max-w-full truncate text-xs text-neutral-500">
              {forecast.description}
            </p>

            {forecast.humidity !== null && (
              <p className="mt-1 text-[0.7rem] text-neutral-600">
                습도 {forecast.humidity}%
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
