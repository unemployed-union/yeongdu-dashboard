// app/api/google/auth/route.ts
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { createGoogleOAuthClient } from "@/lib/google-oauth";

export const runtime = "nodejs";

export async function GET() {
  const oauthClient = createGoogleOAuthClient();
  const state = randomBytes(32).toString("hex");

  const authorizationUrl = oauthClient.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: [
      "https://www.googleapis.com/auth/calendar.events.readonly",
    ],
    state,
  });

  const response = NextResponse.redirect(authorizationUrl);

  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}