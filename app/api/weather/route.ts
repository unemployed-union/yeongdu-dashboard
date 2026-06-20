import { DateTime } from "luxon";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIME_ZONE = "Asia/Seoul";
const KMA_URL =
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

interface KmaResponse {
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

interface WeatherResponse {
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

function getBaseDateTimeCandidates(): DateTime[] {
  const now = DateTime.now().setZone(TIME_ZONE);

  /*
   * 초단기예보는 매시 30분 기준으로 발표됩니다.
   * 최신 자료가 아직 등록되지 않았을 가능성을 고려해
   * 현재 또는 이전 발표 시각을 순서대로 확인합니다.
   */
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

async function requestForecast(
  baseDateTime: DateTime,
): Promise<KmaForecastItem[]> {
  const serviceKey = process.env.KMA_SERVICE_KEY;
  const nx = process.env.KMA_NX;
  const ny = process.env.KMA_NY;

  if (!serviceKey || !nx || !ny) {
    throw new Error(
      "KMA_SERVICE_KEY, KMA_NX, KMA_NY 환경변수가 필요합니다.",
    );
  }

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

  const response = await fetch(`${KMA_URL}?${searchParams.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`기상청 API HTTP 오류: ${response.status}`);
  }

  const rawText = await response.text();

  let data: KmaResponse;

  try {
    data = JSON.parse(rawText) as KmaResponse;
  } catch {
    throw new Error(`기상청 API가 JSON이 아닌 응답을 반환했습니다.`);
  }

  const resultCode = data.response?.header?.resultCode;
  const resultMessage = data.response?.header?.resultMsg;

  if (resultCode !== "00") {
    throw new Error(
      `기상청 API 오류: ${resultCode ?? "UNKNOWN"} ${
        resultMessage ?? ""
      }`,
    );
  }

  return data.response?.body?.items?.item ?? [];
}

async function getLatestForecastItems(): Promise<KmaForecastItem[]> {
  for (const candidate of getBaseDateTimeCandidates()) {
    const items = await requestForecast(candidate);

    if (items.length > 0) {
      return items;
    }
  }

  throw new Error("사용 가능한 초단기예보 데이터가 없습니다.");
}

function createDescription(sky: number, pty: number): string {
  switch (pty) {
    case 1:
      return "비";
    case 2:
      return "비 또는 눈";
    case 3:
      return "눈";
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
      return "구름 많음";
    case 4:
      return "흐림";
    default:
      return "날씨 정보 없음";
  }
}

function selectNearestForecast(
  items: KmaForecastItem[],
): KmaForecastItem[] {
  const now = DateTime.now().setZone(TIME_ZONE);

  const forecastTimes = Array.from(
    new Set(items.map((item) => `${item.fcstDate}${item.fcstTime}`)),
  )
    .map((value) => ({
      value,
      dateTime: DateTime.fromFormat(value, "yyyyLLddHHmm", {
        zone: TIME_ZONE,
      }),
    }))
    .filter((entry) => entry.dateTime.isValid)
    .sort(
      (left, right) =>
        Math.abs(left.dateTime.toMillis() - now.toMillis()) -
        Math.abs(right.dateTime.toMillis() - now.toMillis()),
    );

  const nearest = forecastTimes[0]?.value;

  if (!nearest) {
    throw new Error("예보 시간을 확인할 수 없습니다.");
  }

  return items.filter(
    (item) => `${item.fcstDate}${item.fcstTime}` === nearest,
  );
}

function getValue(
  items: KmaForecastItem[],
  category: string,
): string | undefined {
  return items.find((item) => item.category === category)?.fcstValue;
}

export async function GET() {
  try {
    const allItems = await getLatestForecastItems();
    const items = selectNearestForecast(allItems);

    const temperature = getValue(items, "T1H");
    const humidity = getValue(items, "REH");
    const windSpeed = getValue(items, "WSD");
    const precipitation = getValue(items, "RN1");
    const sky = Number(getValue(items, "SKY") ?? 0);
    const precipitationType = Number(getValue(items, "PTY") ?? 0);

    const firstItem = items[0];

    const result: WeatherResponse = {
      location: process.env.WEATHER_LOCATION_NAME ?? "현재 위치",
      forecastAt: `${firstItem.fcstDate}${firstItem.fcstTime}`,
      temperature:
        temperature === undefined ? null : Number(temperature),
      humidity: humidity === undefined ? null : Number(humidity),
      windSpeed: windSpeed === undefined ? null : Number(windSpeed),
      precipitation: precipitation ?? null,
      sky,
      precipitationType,
      description: createDescription(sky, precipitationType),
    };

    return NextResponse.json(result, {
      headers: {
        /*
         * 여러 태블릿에서 동시에 조회해도 기상청 API를
         * 과도하게 호출하지 않도록 10분간 캐시할 수 있습니다.
         */
        "Cache-Control": "public, max-age=0, s-maxage=600",
      },
    });
  } catch (error) {
    console.error("날씨 조회 실패:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "날씨를 불러오지 못했습니다.",
      },
      { status: 500 },
    );
  }
}