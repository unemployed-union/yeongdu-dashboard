// lib/google-calendar.ts
import { google } from "googleapis";
import { DateTime } from "luxon";

import { createGoogleOAuthClient } from "@/lib/google-oauth";
import { CalendarEvent } from "@/types/calendar";

export interface TodayCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string | null;
  allDay: boolean;
}

const TIME_ZONE = "Asia/Seoul";

export async function getCalendarEvents(
  timeMin: string,
  timeMax: string,
): Promise<CalendarEvent[]> {
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!refreshToken) {
    throw new Error("GOOGLE_REFRESH_TOKEN이 없습니다.");
  }

  const oauthClient = createGoogleOAuthClient();

  oauthClient.setCredentials({
    refresh_token: refreshToken,
  });

  const calendar = google.calendar({
    version: "v3",
    auth: oauthClient,
  });

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime",
    timeZone: "Asia/Seoul",
    maxResults: 250,
  });

  return (response.data.items ?? [])
    .filter(
      (event) =>
        event.status !== "cancelled" &&
        event.id &&
        (event.start?.dateTime || event.start?.date),
    )
    .map((event) => ({
      id: event.id!,
      title: event.summary?.trim() || "제목 없는 일정",
      start: event.start?.dateTime ?? event.start!.date!,
      end:
        event.end?.dateTime ??
        event.end?.date ??
        null,
      allDay: Boolean(event.start?.date),
    }));
}

export async function getTodayCalendarEvents(): Promise<
  CalendarEvent[]
> {
  const startOfToday = DateTime.now()
    .setZone(TIME_ZONE)
    .startOf("day");

  const startOfTomorrow = startOfToday.plus({
    days: 1,
  });

  const timeMin = startOfToday.toUTC().toISO();
  const timeMax = startOfTomorrow.toUTC().toISO();

  if (!timeMin || !timeMax) {
    throw new Error("오늘의 날짜 범위를 생성하지 못했습니다.");
  }

  return getCalendarEvents(timeMin, timeMax);
}