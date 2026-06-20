// app/api/google/callback/route.ts
import { NextRequest, NextResponse } from "next/server";

import { createGoogleOAuthClient } from "@/lib/google-oauth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const savedState = request.cookies.get("google_oauth_state")?.value;

  if (!code) {
    return NextResponse.json(
      { message: "Google 인증 코드가 없습니다." },
      { status: 400 },
    );
  }

  if (!state || !savedState || state !== savedState) {
    return NextResponse.json(
      { message: "잘못된 OAuth 요청입니다." },
      { status: 400 },
    );
  }

  const oauthClient = createGoogleOAuthClient();
  const { tokens } = await oauthClient.getToken(code);

  if (!tokens.refresh_token) {
    return NextResponse.json(
      {
        message:
          "Refresh Token이 발급되지 않았습니다. Google 계정에서 앱 권한을 해제한 후 다시 시도해 주세요.",
      },
      { status: 400 },
    );
  }

  /*
   * 로컬에서 최초 설정할 때만 확인합니다.
   * 토큰을 복사한 뒤 이 로그와 OAuth 설정용 Route를 제거하세요.
   */
  console.log("GOOGLE_REFRESH_TOKEN =", tokens.refresh_token);

  const response = NextResponse.json({
    message:
      "연동이 완료되었습니다. 개발 서버 터미널에서 Refresh Token을 확인하세요.",
  });

  response.cookies.delete("google_oauth_state");

  return response;
}