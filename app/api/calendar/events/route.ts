import { NextRequest, NextResponse } from "next/server";

import { getCalendarEvents } from "@/lib/google-calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const start = request.nextUrl.searchParams.get("start");
    const end = request.nextUrl.searchParams.get("end");

    if (!start || !end) {
      return NextResponse.json(
        {
          message: "조회 시작일과 종료일이 필요합니다.",
        },
        {
          status: 400,
        },
      );
    }

    const events = await getCalendarEvents(start, end);

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Google Calendar 조회 실패:", error);

    return NextResponse.json(
      {
        message: "일정을 불러오지 못했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}