// app/api/calendar/today/route.ts
import { NextResponse } from "next/server";

import { getTodayCalendarEvents } from "@/lib/google-calendar";
import { GoogleApiError } from "@/types/calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const events = await getTodayCalendarEvents();

    return NextResponse.json(
      { events },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    const googleError = error as GoogleApiError;

    console.error("Google Calendar API error:", {
      status: googleError.response?.status ?? googleError.code,
      error: googleError.response?.data?.error,
      description: googleError.response?.data?.error_description,
    });

    console.error("오늘 일정 조회 실패:", error);

    return NextResponse.json(
      {
        message: "오늘 일정을 불러오지 못했습니다.",
      },
      { status: 500 },
    );
  }
}
