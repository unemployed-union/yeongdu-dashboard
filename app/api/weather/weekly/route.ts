// app/api/weather/weekly/route.ts

import { NextResponse } from "next/server";

import { getWeeklyWeather } from "@/lib/weather/kma-weekly";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const weather = await getWeeklyWeather();

    return NextResponse.json(weather, {
      headers: {
        /*
         * 서버나 CDN에서는 30분간 캐시하고,
         * 갱신 중에는 기존 응답을 최대 10분간 사용할 수 있습니다.
         */
        "Cache-Control":
          "public, max-age=0, s-maxage=1800, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("주간 날씨 조회 실패:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "주간 날씨를 불러오지 못했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}