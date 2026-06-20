// lib/weather/get-weather-icon-code.ts

import type {
  WeatherIconCode,
} from "@/components/weather/WeatherIcon";

export function getWeatherIconCode(
  condition: string | null | undefined,
): WeatherIconCode {
  if (!condition) {
    return "unknown";
  }

  const normalized = condition.trim().toLowerCase();

  if (
    normalized.includes("천둥") ||
    normalized.includes("번개")
  ) {
    return "thunderstorm";
  }

  if (
    normalized.includes("진눈깨비") ||
    normalized.includes("비/눈") ||
    normalized.includes("눈/비") ||
    (
      normalized.includes("비") &&
      normalized.includes("눈")
    )
  ) {
    return "sleet";
  }

  if (normalized.includes("소나기")) {
    return "shower";
  }

  if (
    normalized.includes("비") ||
    normalized.includes("빗방울")
  ) {
    return "rain";
  }

  if (
    normalized.includes("눈") ||
    normalized.includes("눈날림")
  ) {
    return "snow";
  }

  if (normalized.includes("안개")) {
    return "fog";
  }

  if (normalized.includes("흐림")) {
    return "cloudy";
  }

  if (normalized.includes("구름")) {
    return "partly-cloudy";
  }

  if (normalized.includes("맑음")) {
    return "clear";
  }

  return "unknown";
}

/**
 * 기상청 단기예보 SKY·PTY 코드 기반 변환
 *
 * PTY
 * 0: 없음
 * 1: 비
 * 2: 비/눈
 * 3: 눈
 * 4: 소나기
 * 5: 빗방울
 * 6: 빗방울/눈날림
 * 7: 눈날림
 */
export function getWeatherIconCodeFromKma(
  sky: number,
  precipitationType: number,
): WeatherIconCode {
  switch (precipitationType) {
    case 1:
    case 5:
      return "rain";

    case 2:
    case 6:
      return "sleet";

    case 3:
    case 7:
      return "snow";

    case 4:
      return "shower";
  }

  switch (sky) {
    case 1:
      return "clear";

    case 3:
      return "partly-cloudy";

    case 4:
      return "cloudy";

    default:
      return "unknown";
  }
}