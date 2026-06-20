// lib/weather/kma-hourly.ts

import { DateTime } from "luxon";

const TIME_ZONE = "Asia/Seoul";

const ULTRA_FORECAST_URL =
  "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst";

interface KmaForecastItem {
  baseDate: string;
  baseTime: string;
  category: string;
  fcstDate: string;
  fcstTime: string;
  fcstValue: string;
  nx: number;
  ny: number;
}

interface KmaApiResponse {
  response?: {
    header?: {
      resultCode?: string;
      resultMsg?: string;
    };
    body?: {
      items?: {
        item?: KmaForecastItem[];
      };
    };
  };
}

export interface HourlyWeatherItem {
  forecastAt: string;
  temperature: number | null;
  humidity: number | null;
  windSpeed: number | null;
  precipitationAmount: string | null;
  sky: number;
  precipitationType: number;
  description: string;
}

export interface HourlyWeatherResponse {
  location: string;
  baseAt: string;
  forecasts: HourlyWeatherItem[];
}

interface HourlyAccumulator {
  forecastAt: DateTime;
  temperature: number | null;
  humidity: number | null;
  windSpeed: number | null;
  precipitationAmount: string | null;
  sky: number;
  precipitationType: number;
}

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} 환경변수가 설정되지 않았습니다.`);
  }

  return value;
}

function toFiniteNumber(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const parsed = Number(String(value).trim());

  return Number.isFinite(parsed) ? parsed : null;
}

function getDescription(
  sky: number,
  precipitationType: number,
): string {
  switch (precipitationType) {
    case 1:
      return "비";
    case 2:
      return "비 또는 눈";
    case 3:
      return "눈";
    case 4:
      return "소나기";
    case 5:
      return "빗방울";
    case 6:
      return "빗방울 또는 눈날림";
    case 7:
      return "눈날림";
  }

  switch (sky) {
    case 1:
      return "맑음";
    case 3:
      return "구름많음";
    case 4:
      return "흐림";
    default:
      return "정보 없음";
  }
}

/**
 * 초단기예보는 매시 30분 기준으로 요청합니다.
 * 자료 등록 지연에 대비해 최신 후보부터 이전 발표 시각까지 확인합니다.
 */
function getBaseTimeCandidates(): DateTime[] {
  const now = DateTime.now().setZone(TIME_ZONE);

  const latest =
    now.minute >= 45
      ? now.set({
          minute: 30,
          second: 0,
          millisecond: 0,
        })
      : now.minus({ hours: 1 }).set({
          minute: 30,
          second: 0,
          millisecond: 0,
        });

  return [
    latest,
    latest.minus({ hours: 1 }),
    latest.minus({ hours: 2 }),
  ];
}

async function requestUltraForecast(
  baseDateTime: DateTime,
): Promise<KmaForecastItem[]> {
  const serviceKey =
    requireEnvironmentVariable("KMA_SERVICE_KEY");

  const nx = requireEnvironmentVariable("KMA_NX");
  const ny = requireEnvironmentVariable("KMA_NY");

  const searchParams = new URLSearchParams({
    serviceKey,
    pageNo: "1",
    numOfRows: "1000",
    dataType: "JSON",
    base_date: baseDateTime.toFormat("yyyyLLdd"),
    base_time: baseDateTime.toFormat("HHmm"),
    nx,
    ny,
  });

  const response = await fetch(
    `${ULTRA_FORECAST_URL}?${searchParams.toString()}`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      `기상청 초단기예보 HTTP 오류: ${response.status}`,
    );
  }

  const rawText = await response.text();

  let data: KmaApiResponse;

  try {
    data = JSON.parse(rawText) as KmaApiResponse;
  } catch {
    throw new Error(
      `기상청에서 JSON이 아닌 응답을 반환했습니다: ${rawText.slice(
        0,
        100,
      )}`,
    );
  }

  const resultCode = data.response?.header?.resultCode;

  if (resultCode !== "00" && resultCode !== "0") {
    throw new Error(
      `기상청 API 오류: ${
        data.response?.header?.resultMsg ?? resultCode
      }`,
    );
  }

  return data.response?.body?.items?.item ?? [];
}

async function getLatestForecast(): Promise<{
  baseAt: DateTime;
  items: KmaForecastItem[];
}> {
  let lastError: unknown;

  for (const candidate of getBaseTimeCandidates()) {
    try {
      const items = await requestUltraForecast(candidate);

      if (items.length > 0) {
        return {
          baseAt: candidate,
          items,
        };
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error(
    "사용 가능한 초단기예보 데이터를 찾지 못했습니다.",
  );
}

function aggregateForecasts(
  items: KmaForecastItem[],
): HourlyWeatherItem[] {
  const forecastMap = new Map<string, HourlyAccumulator>();

  for (const item of items) {
    const key = `${item.fcstDate}${item.fcstTime}`;

    let forecast = forecastMap.get(key);

    if (!forecast) {
      const forecastAt = DateTime.fromFormat(
        key,
        "yyyyLLddHHmm",
        {
          zone: TIME_ZONE,
        },
      );

      if (!forecastAt.isValid) {
        continue;
      }

      forecast = {
        forecastAt,
        temperature: null,
        humidity: null,
        windSpeed: null,
        precipitationAmount: null,
        sky: 0,
        precipitationType: 0,
      };

      forecastMap.set(key, forecast);
    }

    switch (item.category) {
      case "T1H":
        forecast.temperature = toFiniteNumber(item.fcstValue);
        break;

      case "REH":
        forecast.humidity = toFiniteNumber(item.fcstValue);
        break;

      case "WSD":
        forecast.windSpeed = toFiniteNumber(item.fcstValue);
        break;

      case "RN1":
        forecast.precipitationAmount =
          item.fcstValue.trim() || null;
        break;

      case "SKY":
        forecast.sky =
          toFiniteNumber(item.fcstValue) ?? 0;
        break;

      case "PTY":
        forecast.precipitationType =
          toFiniteNumber(item.fcstValue) ?? 0;
        break;
    }
  }

  const now = DateTime.now().setZone(TIME_ZONE);

  return Array.from(forecastMap.values())
    .filter(
      (forecast) =>
        forecast.forecastAt.toMillis() >=
        now.startOf("hour").toMillis(),
    )
    .sort(
      (left, right) =>
        left.forecastAt.toMillis() -
        right.forecastAt.toMillis(),
    )
    .slice(0, 6)
    .map((forecast) => ({
      forecastAt: forecast.forecastAt.toISO()!,
      temperature: forecast.temperature,
      humidity: forecast.humidity,
      windSpeed: forecast.windSpeed,
      precipitationAmount: forecast.precipitationAmount,
      sky: forecast.sky,
      precipitationType: forecast.precipitationType,
      description: getDescription(
        forecast.sky,
        forecast.precipitationType,
      ),
    }));
}

export async function getHourlyWeather(): Promise<HourlyWeatherResponse> {
  const { baseAt, items } = await getLatestForecast();

  return {
    location:
      process.env.WEATHER_LOCATION_NAME?.trim() ||
      "현재 지역",

    baseAt: baseAt.toISO()!,
    forecasts: aggregateForecasts(items),
  };
}