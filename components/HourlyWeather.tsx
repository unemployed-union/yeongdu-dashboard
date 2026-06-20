"use client";

import { useQuery } from "@tanstack/react-query";
import type { IconType } from "react-icons";
import {
  WiCloud,
  WiCloudy,
  WiDaySunny,
  WiNightClear,
  WiRain,
  WiRainMix,
  WiShowers,
  WiSnow,
} from "react-icons/wi";

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

    throw new Error(
      body?.message ??
        "시간별 날씨를 불러오지 못했습니다.",
    );
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

function getWeatherIcon(
  forecast: HourlyWeatherItem,
): IconType {
  switch (forecast.precipitationType) {
    case 1:
    case 5:
      return WiRain;

    case 2:
    case 6:
      return WiRainMix;

    case 3:
    case 7:
      return WiSnow;

    case 4:
      return WiShowers;
  }

  if (forecast.sky === 1) {
    return isNight(forecast.forecastAt)
      ? WiNightClear
      : WiDaySunny;
  }

  if (forecast.sky === 3) {
    return WiCloud;
  }

  return WiCloudy;
}

function formatForecastTime(forecastAt: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(new Date(forecastAt));
}

function Temperature({
  value,
}: {
  value: number | null;
}) {
  return (
    <>
      {value !== null && Number.isFinite(value)
        ? `${Math.round(value)}°`
        : "--"}
    </>
  );
}

export function HourlyWeather() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["weather", "hourly"],
    queryFn: fetchHourlyWeather,

    // 초단기예보 변경 확인
    refetchInterval: 10 * 60 * 1000,
    staleTime: 5 * 60 * 1000,

    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  if (isPending) {
    return (
      <div className="flex min-h-36 items-center justify-center text-neutral-500">
        시간별 날씨를 불러오는 중입니다.
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-36 flex-col items-center justify-center gap-1 text-neutral-500">
        <p>시간별 날씨를 불러오지 못했습니다.</p>
        <p className="text-xs text-red-400">
          {error.message}
        </p>
      </div>
    );
  }

  if (data.forecasts.length === 0) {
    return (
      <div className="flex min-h-36 items-center justify-center text-neutral-500">
        표시할 초단기예보가 없습니다.
      </div>
    );
  }

  return (
    <section className="w-full">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-lg font-semibold text-neutral-200">
          시간별 날씨
        </h2>

        <p className="text-xs text-neutral-600">
          앞으로 6시간
        </p>
      </div>

      <div className="grid grid-cols-6 gap-2">
        {data.forecasts.map((forecast) => {
          const WeatherIcon = getWeatherIcon(forecast);

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
                aria-label={forecast.description}
                className="my-1 h-10 w-10 shrink-0 md:h-12 md:w-12"
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
    </section>
  );
}