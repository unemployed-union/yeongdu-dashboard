"use client";

import { useQuery } from "@tanstack/react-query";

import { WeatherIcon } from "@/components/weather/WeatherIcon";
import {
  getWeatherIconCode,
  getWeatherIconCodeFromKma,
} from "@/lib/weather/get-weather-icon-code";

interface CurrentWeatherResponse {
  location: string;
  temperature: number;

  // API에 따라 둘 중 하나를 사용할 수 있음
  condition?: string;
  description?: string;

  // 기상청 코드가 응답에 포함되는 경우
  sky?: number | null;
  precipitationType?: number | null;

  humidity?: number | null;
  precipitationProbability?: number | null;
}

async function fetchCurrentWeather(): Promise<CurrentWeatherResponse> {
  const response = await fetch("/api/weather", {
    cache: "no-store",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;

    throw new Error(
      body?.message ??
        "현재 날씨를 불러오지 못했습니다.",
    );
  }

  return response.json() as Promise<CurrentWeatherResponse>;
}

function isDaytime(): boolean {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: "Asia/Seoul",
    }).format(new Date()),
  );

  return hour >= 6 && hour < 19;
}

export function CurrentWeatherSummary() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["weather", "current"],
    queryFn: fetchCurrentWeather,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    refetchOnReconnect: true,
  });

  if (isPending) {
    return (
      <div
        aria-label="현재 날씨를 불러오는 중"
        className="h-20 w-48 animate-pulse rounded-2xl bg-white/5"
      />
    );
  }

  if (isError || !data) {
    return null;
  }

  const weatherText =
    data.description?.trim() ||
    data.condition?.trim() ||
    "날씨 정보 없음";

  const hasKmaCodes =
    typeof data.sky === "number" &&
    typeof data.precipitationType === "number";

  const iconCode = hasKmaCodes
    ? getWeatherIconCodeFromKma(
        data.sky!,
        data.precipitationType!,
      )
    : getWeatherIconCode(weatherText);

  return (
    <aside
      aria-label={`현재 날씨 ${weatherText}, ${Math.round(
        data.temperature,
      )}도`}
      className="
        flex shrink-0 items-center gap-2
        rounded-2xl border border-white/10
        bg-white/[0.04] px-4 py-2
      "
    >
      <WeatherIcon
        code={iconCode}
        isDaytime={isDaytime()}
        size={58}
        ariaLabel={weatherText}
        className="shrink-0 text-neutral-100"
      />

      <div className="min-w-0 text-right">
        <div className="flex items-baseline justify-end gap-2">
          <span className="text-3xl font-semibold tabular-nums">
            {Math.round(data.temperature)}°
          </span>

          {weatherText !== "날씨 정보 없음" && (
            <span className="max-w-24 truncate text-sm text-neutral-300">
              {weatherText}
            </span>
          )}
        </div>

        <div className="mt-1 flex justify-end gap-2 text-xs text-neutral-500">
          <span>{data.location}</span>

          {data.humidity !== null &&
            data.humidity !== undefined && (
              <span>습도 {data.humidity}%</span>
            )}
        </div>
      </div>
    </aside>
  );
}