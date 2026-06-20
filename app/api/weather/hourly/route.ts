// app/api/weather/hourly/route.ts

import { NextResponse } from "next/server";

import { getHourlyWeather } from "@/lib/weather/kma-hourly";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const weather = await getHourlyWeather();

    return NextResponse.json(weather, {
      headers: {
        "Cache-Control":
          "public, max-age=0, s-maxage=600, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("시간별 날씨 조회 실패:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "시간별 날씨를 불러오지 못했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}