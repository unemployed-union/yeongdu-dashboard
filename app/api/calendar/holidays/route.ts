// app/api/calendar/holidays/route.ts

import { NextRequest, NextResponse } from "next/server";

import { getKoreanHolidayEvents } from "@/lib/korean-holidays";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const start = request.nextUrl.searchParams.get("start");
    const end = request.nextUrl.searchParams.get("end");

    if (!start || !end) {
      return NextResponse.json(
        {
          message: "start와 end가 필요합니다.",
        },
        { status: 400 },
      );
    }

    const events = await getKoreanHolidayEvents(start, end);

    return NextResponse.json(events, {
      headers: {
        "Cache-Control":
          "public, max-age=0, s-maxage=86400, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("공휴일 조회 실패:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "공휴일을 불러오지 못했습니다.",
      },
      { status: 500 },
    );
  }
}