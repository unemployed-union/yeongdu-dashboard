// lib/weather/kma-weekly.ts

import { DateTime } from "luxon";

const TIME_ZONE = "Asia/Seoul";

const SHORT_FORECAST_URL =
  "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";

const MID_LAND_FORECAST_URL =
  "https://apis.data.go.kr/1360000/MidFcstInfoService/getMidLandFcst";

const MID_TEMPERATURE_URL =
  "https://apis.data.go.kr/1360000/MidFcstInfoService/getMidTa";

type KmaValue = string | number | null | undefined;

interface KmaApiResponse<T> {
  response?: {
    header?: {
      resultCode?: string;
      resultMsg?: string;
    };
    body?: {
      items?: {
        item?: T[] | T;
      };
    };
  };
}

interface ShortForecastItem {
  baseDate: string;
  baseTime: string;
  category: string;
  fcstDate: string;
  fcstTime: string;
  fcstValue: string;
  nx: number;
  ny: number;
}

type MidLandForecastItem = Record<string, KmaValue>;
type MidTemperatureItem = Record<string, KmaValue>;

export interface DailyWeather {
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

export interface WeeklyWeatherResponse {
  location: string;
  generatedAt: string;
  forecasts: DailyWeather[];
  warnings: string[];
}

interface ShortDayAccumulator {
  date: string;
  temperatures: number[];
  minTemperature: number | null;
  maxTemperature: number | null;
  morningRainProbabilities: number[];
  afternoonRainProbabilities: number[];
  conditions: Map<
    string,
    {
      sky?: number;
      precipitationType?: number;
    }
  >;
}

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} 환경변수가 설정되지 않았습니다.`);
  }

  return value;
}

function toNumber(value: KmaValue): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function toStringValue(value: KmaValue): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const result = String(value).trim();

  return result.length > 0 ? result : null;
}

async function requestKmaApi<T>(
  url: string,
  parameters: Record<string, string>,
): Promise<T[]> {
  const serviceKey = requireEnvironmentVariable("KMA_SERVICE_KEY");

  /*
   * 공공데이터포털에서 제공하는 Decoding 인증키를
   * URLSearchParams에 전달합니다.
   */
  const searchParams = new URLSearchParams({
    serviceKey,
    pageNo: "1",
    numOfRows: "2000",
    dataType: "JSON",
    ...parameters,
  });

  const response = await fetch(`${url}?${searchParams.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `기상청 API HTTP 오류가 발생했습니다: ${response.status}`,
    );
  }

  const rawText = await response.text();

  let data: KmaApiResponse<T>;

  try {
    data = JSON.parse(rawText) as KmaApiResponse<T>;
  } catch {
    throw new Error(
      `기상청 API가 JSON이 아닌 응답을 반환했습니다: ${rawText.slice(
        0,
        100,
      )}`,
    );
  }

  const resultCode = data.response?.header?.resultCode;
  const resultMessage = data.response?.header?.resultMsg;

  if (resultCode !== "00" && resultCode !== "0") {
    throw new Error(
      `기상청 API 오류: ${resultCode ?? "UNKNOWN"} ${
        resultMessage ?? ""
      }`,
    );
  }

  const item = data.response?.body?.items?.item;

  if (!item) {
    return [];
  }

  return Array.isArray(item) ? item : [item];
}

/**
 * 발표 시각보다 API 등록이 조금 늦어질 수 있으므로
 * 일정 시간 이전의 발표 시각만 후보로 선택합니다.
 */
function createBaseTimeCandidates(
  baseHours: number[],
  delayMinutes: number,
  limit: number,
): DateTime[] {
  const availableBefore = DateTime.now()
    .setZone(TIME_ZONE)
    .minus({ minutes: delayMinutes });

  const candidates: DateTime[] = [];

  for (let dayOffset = 0; dayOffset < 3; dayOffset += 1) {
    const targetDay = availableBefore
      .minus({ days: dayOffset })
      .startOf("day");

    for (const hour of baseHours) {
      const candidate = targetDay.set({
        hour,
        minute: 0,
        second: 0,
        millisecond: 0,
      });

      if (candidate.toMillis() <= availableBefore.toMillis()) {
        candidates.push(candidate);
      }
    }
  }

  return candidates
    .sort((left, right) => right.toMillis() - left.toMillis())
    .slice(0, limit);
}

async function getLatestShortForecastItems(): Promise<
  ShortForecastItem[]
> {
  const nx = requireEnvironmentVariable("KMA_NX");
  const ny = requireEnvironmentVariable("KMA_NY");

  /*
   * 단기예보 발표 시각:
   * 02, 05, 08, 11, 14, 17, 20, 23시
   */
  const candidates = createBaseTimeCandidates(
    [2, 5, 8, 11, 14, 17, 20, 23],
    15,
    5,
  );

  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      const items = await requestKmaApi<ShortForecastItem>(
        SHORT_FORECAST_URL,
        {
          base_date: candidate.toFormat("yyyyLLdd"),
          base_time: candidate.toFormat("HHmm"),
          nx,
          ny,
        },
      );

      if (items.length > 0) {
        return items;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error("사용 가능한 단기예보 데이터가 없습니다.");
}

function getShortCondition(
  sky: number | undefined,
  precipitationType: number | undefined,
): string | null {
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
      return null;
  }
}

function getMaximum(values: number[]): number | null {
  return values.length > 0 ? Math.max(...values) : null;
}

function getMinimum(values: number[]): number | null {
  return values.length > 0 ? Math.min(...values) : null;
}

function selectShortCondition(
  conditions: ShortDayAccumulator["conditions"],
  period: "morning" | "afternoon",
): string | null {
  const targetMinutes = period === "morning" ? 9 * 60 : 15 * 60;

  const candidates = Array.from(conditions.entries())
    .map(([time, value]) => {
      const hour = Number(time.slice(0, 2));
      const minute = Number(time.slice(2, 4));
      const totalMinutes = hour * 60 + minute;

      return {
        totalMinutes,
        condition: getShortCondition(
          value.sky,
          value.precipitationType,
        ),
      };
    })
    .filter((entry) => {
      if (!entry.condition) {
        return false;
      }

      return period === "morning"
        ? entry.totalMinutes < 12 * 60
        : entry.totalMinutes >= 12 * 60;
    })
    .sort(
      (left, right) =>
        Math.abs(left.totalMinutes - targetMinutes) -
        Math.abs(right.totalMinutes - targetMinutes),
    );

  return candidates[0]?.condition ?? null;
}

function aggregateShortForecast(
  items: ShortForecastItem[],
): Map<string, DailyWeather> {
  const dayMap = new Map<string, ShortDayAccumulator>();

  function getAccumulator(fcstDate: string): ShortDayAccumulator {
    const existing = dayMap.get(fcstDate);

    if (existing) {
      return existing;
    }

    const created: ShortDayAccumulator = {
      date: fcstDate,
      temperatures: [],
      minTemperature: null,
      maxTemperature: null,
      morningRainProbabilities: [],
      afternoonRainProbabilities: [],
      conditions: new Map(),
    };

    dayMap.set(fcstDate, created);

    return created;
  }

  for (const item of items) {
    const day = getAccumulator(item.fcstDate);
    const value = toNumber(item.fcstValue);
    const hour = Number(item.fcstTime.slice(0, 2));

    switch (item.category) {
      case "TMP":
        if (value !== null) {
          day.temperatures.push(value);
        }
        break;

      case "TMN":
        day.minTemperature = value;
        break;

      case "TMX":
        day.maxTemperature = value;
        break;

      case "POP":
        if (value !== null) {
          if (hour < 12) {
            day.morningRainProbabilities.push(value);
          } else {
            day.afternoonRainProbabilities.push(value);
          }
        }
        break;

      case "SKY": {
        const condition = day.conditions.get(item.fcstTime) ?? {};

        if (value !== null) {
          condition.sky = value;
        }

        day.conditions.set(item.fcstTime, condition);
        break;
      }

      case "PTY": {
        const condition = day.conditions.get(item.fcstTime) ?? {};

        if (value !== null) {
          condition.precipitationType = value;
        }

        day.conditions.set(item.fcstTime, condition);
        break;
      }
    }
  }

  const result = new Map<string, DailyWeather>();

  for (const [dateKey, day] of dayMap) {
    const date = DateTime.fromFormat(dateKey, "yyyyLLdd", {
      zone: TIME_ZONE,
      locale: "ko",
    });

    if (!date.isValid) {
      continue;
    }

    const morningCondition = selectShortCondition(
      day.conditions,
      "morning",
    );

    const afternoonCondition = selectShortCondition(
      day.conditions,
      "afternoon",
    );

    const morningRainProbability = getMaximum(
      day.morningRainProbabilities,
    );

    const afternoonRainProbability = getMaximum(
      day.afternoonRainProbabilities,
    );

    result.set(date.toISODate()!, {
      date: date.toISODate()!,
      weekday: date.toFormat("ccc"),

      /*
       * TMN/TMX가 없을 경우 조회된 시간별 기온의
       * 최저·최고값을 대신 사용합니다.
       */
      minTemperature:
        day.minTemperature ?? getMinimum(day.temperatures),

      maxTemperature:
        day.maxTemperature ?? getMaximum(day.temperatures),

      morningCondition,
      afternoonCondition,

      morningRainProbability,
      afternoonRainProbability,

      condition: afternoonCondition ?? morningCondition,

      rainProbability: getMaximum(
        [
          morningRainProbability,
          afternoonRainProbability,
        ].filter((value): value is number => value !== null),
      ),

      source: "short",
    });
  }

  return result;
}

interface LatestMidForecast {
  baseTime: DateTime;
  land: MidLandForecastItem;
  temperature: MidTemperatureItem;
}

async function getLatestMidForecast(): Promise<LatestMidForecast> {
  const landRegId = requireEnvironmentVariable(
    "KMA_MID_LAND_REG_ID",
  );

  const temperatureRegId = requireEnvironmentVariable(
    "KMA_MID_TA_REG_ID",
  );

  /*
   * 중기예보는 매일 06시, 18시에 발표됩니다.
   */
  const candidates = createBaseTimeCandidates([6, 18], 20, 4);

  let lastError: unknown;

  for (const candidate of candidates) {
    const tmFc = candidate.toFormat("yyyyLLddHHmm");

    try {
      const [landItems, temperatureItems] = await Promise.all([
        requestKmaApi<MidLandForecastItem>(
          MID_LAND_FORECAST_URL,
          {
            regId: landRegId,
            tmFc,
          },
        ),

        requestKmaApi<MidTemperatureItem>(
          MID_TEMPERATURE_URL,
          {
            regId: temperatureRegId,
            tmFc,
          },
        ),
      ]);

      if (landItems[0] && temperatureItems[0]) {
        return {
          baseTime: candidate,
          land: landItems[0],
          temperature: temperatureItems[0],
        };
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error("사용 가능한 중기예보 데이터가 없습니다.");
}

function aggregateMidForecast(
  forecast: LatestMidForecast,
): Map<string, DailyWeather> {
  const result = new Map<string, DailyWeather>();
  const baseDate = forecast.baseTime.startOf("day");

  /*
   * 오늘부터 7일간 표시할 때 필요한 범위는 보통
   * 4~7일 후 데이터입니다.
   */
  for (let dayOffset = 4; dayOffset <= 7; dayOffset += 1) {
    const date = baseDate.plus({ days: dayOffset });

    const morningCondition = toStringValue(
      forecast.land[`wf${dayOffset}Am`],
    );

    const afternoonCondition = toStringValue(
      forecast.land[`wf${dayOffset}Pm`],
    );

    const morningRainProbability = toNumber(
      forecast.land[`rnSt${dayOffset}Am`],
    );

    const afternoonRainProbability = toNumber(
      forecast.land[`rnSt${dayOffset}Pm`],
    );

    const minTemperature = toNumber(
      forecast.temperature[`taMin${dayOffset}`],
    );

    const maxTemperature = toNumber(
      forecast.temperature[`taMax${dayOffset}`],
    );

    result.set(date.toISODate()!, {
      date: date.toISODate()!,
      weekday: date.setLocale("ko").toFormat("ccc"),

      minTemperature,
      maxTemperature,

      morningCondition,
      afternoonCondition,

      morningRainProbability,
      afternoonRainProbability,

      condition: afternoonCondition ?? morningCondition,

      rainProbability: getMaximum(
        [
          morningRainProbability,
          afternoonRainProbability,
        ].filter((value): value is number => value !== null),
      ),

      source: "mid",
    });
  }

  return result;
}

function combineWeather(
  shortForecast: DailyWeather | undefined,
  midForecast: DailyWeather | undefined,
  date: DateTime,
): DailyWeather {
  const dateString = date.toISODate()!;

  if (!shortForecast && !midForecast) {
    return {
      date: dateString,
      weekday: date.setLocale("ko").toFormat("ccc"),
      minTemperature: null,
      maxTemperature: null,
      morningCondition: null,
      afternoonCondition: null,
      morningRainProbability: null,
      afternoonRainProbability: null,
      condition: null,
      rainProbability: null,
      source: "none",
    };
  }

  return {
    date: dateString,
    weekday: date.setLocale("ko").toFormat("ccc"),

    /*
     * 가까운 날짜에는 더 세밀한 단기예보를 우선 사용하고,
     * 값이 없을 때만 중기예보로 보완합니다.
     */
    minTemperature:
      shortForecast?.minTemperature ??
      midForecast?.minTemperature ??
      null,

    maxTemperature:
      shortForecast?.maxTemperature ??
      midForecast?.maxTemperature ??
      null,

    morningCondition:
      shortForecast?.morningCondition ??
      midForecast?.morningCondition ??
      null,

    afternoonCondition:
      shortForecast?.afternoonCondition ??
      midForecast?.afternoonCondition ??
      null,

    morningRainProbability:
      shortForecast?.morningRainProbability ??
      midForecast?.morningRainProbability ??
      null,

    afternoonRainProbability:
      shortForecast?.afternoonRainProbability ??
      midForecast?.afternoonRainProbability ??
      null,

    condition:
      shortForecast?.condition ??
      midForecast?.condition ??
      null,

    rainProbability:
      shortForecast?.rainProbability ??
      midForecast?.rainProbability ??
      null,

    source:
      shortForecast && midForecast
        ? "merged"
        : shortForecast
          ? "short"
          : "mid",
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "알 수 없는 오류가 발생했습니다.";
}

export async function getWeeklyWeather(): Promise<WeeklyWeatherResponse> {
  /*
   * 한쪽 API가 잠시 실패해도 나머지 예보는 표시하기 위해
   * Promise.allSettled를 사용합니다.
   */
  const [shortResult, midResult] = await Promise.allSettled([
    getLatestShortForecastItems(),
    getLatestMidForecast(),
  ]);

  if (
    shortResult.status === "rejected" &&
    midResult.status === "rejected"
  ) {
    throw new Error(
      [
        "단기예보와 중기예보 조회에 모두 실패했습니다.",
        getErrorMessage(shortResult.reason),
        getErrorMessage(midResult.reason),
      ].join(" "),
    );
  }

  const warnings: string[] = [];

  const shortForecastMap =
    shortResult.status === "fulfilled"
      ? aggregateShortForecast(shortResult.value)
      : new Map<string, DailyWeather>();

  if (shortResult.status === "rejected") {
    warnings.push(
      `단기예보 조회 실패: ${getErrorMessage(shortResult.reason)}`,
    );
  }

  const midForecastMap =
    midResult.status === "fulfilled"
      ? aggregateMidForecast(midResult.value)
      : new Map<string, DailyWeather>();

  if (midResult.status === "rejected") {
    warnings.push(
      `중기예보 조회 실패: ${getErrorMessage(midResult.reason)}`,
    );
  }

  const today = DateTime.now().setZone(TIME_ZONE).startOf("day");

  const forecasts = Array.from({ length: 7 }, (_, index) => {
    const date = today.plus({ days: index });
    const dateString = date.toISODate()!;

    return combineWeather(
      shortForecastMap.get(dateString),
      midForecastMap.get(dateString),
      date,
    );
  });

  return {
    location:
      process.env.WEATHER_LOCATION_NAME?.trim() || "현재 지역",

    generatedAt: DateTime.now().setZone(TIME_ZONE).toISO()!,

    forecasts,
    warnings,
  };
}