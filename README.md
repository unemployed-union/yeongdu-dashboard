# YeongduDashboard

태블릿을 탁상시계, 일정판, 달력 및 날씨 정보 화면으로 활용하기 위한 개인용 대시보드입니다.

기본 화면에서는 플립 스타일의 날짜와 시계, Google Calendar의 오늘 일정을 표시합니다. 화면을 좌우로 밀면 기상청 날씨 정보와 월간 달력을 확인할 수 있습니다.

## 주요 기능

### 플립 시계

* 12시간제 현재 시각 표시
* AM/PM 표시
* 날짜 및 요일 표시
* 태블릿 화면 크기에 맞춘 반응형 글자 크기
* FlipClock 기반 애니메이션

### Google Calendar 연동

* 오늘의 일정 표시
* Google Calendar 월간 일정 표시
* 반복 일정 및 종일 일정 지원
* 일정 시작 시각 순서로 정렬
* 일정 자동 갱신
* OAuth 2.0 Refresh Token을 이용한 서버 측 인증

### 기상청 날씨 연동

* 현재 기온 및 현재 날씨 표시
* 습도 및 풍속 표시
* 앞으로 약 6시간의 초단기예보 표시
* 오늘부터 7일간의 단기·중기예보 표시
* 오전·오후 날씨 및 강수확률 표시
* 기상 상태에 따른 아이콘 표시
* 기상청 단기예보와 중기예보 결과 통합

### 슬라이드 화면

* CSS Scroll Snap 기반 좌우 화면 전환
* 태블릿 터치 스와이프 지원
* 터치패드 가로 스크롤 지원
* 기본 시작 화면을 가운데 시계 화면으로 설정
* 브라우저 스크롤바 숨김 처리

## 기술 스택

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS
* TanStack Query
* FullCalendar
* FlipClock.js
* React Icons
* Luxon

### External APIs

* Google Calendar API
* 기상청 단기예보 조회서비스
* 기상청 중기예보 조회서비스

## 화면 구성

| 화면    | 내용                      |
| ----- | ----------------------- |
| 날씨 화면 | 현재 날씨, 시간별 초단기예보, 7일 예보 |
| 기본 화면 | 플립 날짜, 플립 시계, 오늘의 일정    |
| 달력 화면 | Google Calendar 월간 일정   |

## 프로젝트 실행

### 1. 저장소 복제

```bash
git clone <repository-url>
cd <project-directory>
```

### 2. 패키지 설치

```bash
npm install
```

필요한 주요 패키지를 별도로 설치하려면 다음 명령을 사용할 수 있습니다.

```bash
npm install \
  flipclock \
  googleapis \
  luxon \
  react-icons \
  @tanstack/react-query \
  @fullcalendar/react \
  @fullcalendar/core
```

### 3. 환경변수 설정

프로젝트 루트에 `.env.local` 파일을 생성합니다.

```env
# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
GOOGLE_REFRESH_TOKEN=

# 기상청 API
KMA_SERVICE_KEY=

# 단기예보용 기상청 격자 좌표
KMA_NX=
KMA_NY=

# 중기예보 지역 코드
KMA_MID_LAND_REG_ID=
KMA_MID_TA_REG_ID=

# 화면에 표시할 지역명
WEATHER_LOCATION_NAME=
```

환경변수 파일에는 API 키와 Refresh Token이 포함되므로 Git 저장소에 올리지 않습니다.

```gitignore
.env
.env.local
.env.*.local
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 다음 주소를 엽니다.

```text
http://localhost:3000
```

## Google Calendar 설정

### Google Cloud 프로젝트 설정

1. Google Cloud Console에서 프로젝트를 생성합니다.
2. Google Calendar API를 활성화합니다.
3. OAuth 동의 화면을 구성합니다.
4. 웹 애플리케이션 유형의 OAuth 클라이언트를 생성합니다.
5. 승인된 리디렉션 URI를 등록합니다.

로컬 개발 환경의 리디렉션 URI는 다음과 같습니다.

```text
http://localhost:3000/api/google/callback
```

### Refresh Token 발급

개발 서버 실행 후 다음 주소로 접속합니다.

```text
http://localhost:3000/api/google/auth
```

Google 계정 인증과 Calendar 읽기 권한 승인을 완료하면 서버 터미널에서 Refresh Token을 확인할 수 있습니다.

발급된 값을 `.env.local`에 저장합니다.

```env
GOOGLE_REFRESH_TOKEN=발급받은_Refresh_Token
```

Refresh Token 설정이 완료된 후에는 인증용 API 경로를 제거하거나 관리자만 접근할 수 있도록 제한하는 것이 좋습니다.

## 기상청 API 설정

공공데이터포털에서 다음 API의 활용 신청이 필요합니다.

* 기상청 단기예보 조회서비스
* 기상청 중기예보 조회서비스

### 단기예보 격자 좌표

기상청 단기예보는 위도와 경도 대신 `nx`, `ny` 격자 좌표를 사용합니다.

```env
KMA_NX=60
KMA_NY=127
```

위 값은 예시이므로 실제 태블릿 설치 지역에 맞는 격자 좌표로 변경해야 합니다.

### 중기예보 지역 코드

중기예보는 육상예보와 기온예보에서 서로 다른 지역 코드를 사용합니다.

서울 지역 예시는 다음과 같습니다.

```env
KMA_MID_LAND_REG_ID=11B00000
KMA_MID_TA_REG_ID=11B10101
```

다른 지역에서 사용할 경우 해당 지역의 코드를 확인하여 변경해야 합니다.

## API 경로

| Method | 경로                     | 설명                        |
| ------ | ---------------------- | ------------------------- |
| GET    | `/api/google/auth`     | Google OAuth 인증 시작        |
| GET    | `/api/google/callback` | Google OAuth 인증 결과 처리     |
| GET    | `/api/calendar/today`  | 오늘의 Google Calendar 일정 조회 |
| GET    | `/api/calendar/events` | 지정된 기간의 일정 조회             |
| GET    | `/api/weather`         | 현재 날씨 조회                  |
| GET    | `/api/weather/hourly`  | 초단기 시간별 예보 조회             |
| GET    | `/api/weather/weekly`  | 단기·중기 주간예보 조회             |

월간 일정 조회 API는 다음과 같이 조회 기간을 전달받습니다.

```text
/api/calendar/events?start=2026-06-01T00:00:00+09:00&end=2026-07-01T00:00:00+09:00
```

## 데이터 갱신

화면에 계속 표시되는 대시보드의 특성상 TanStack Query와 타이머를 이용하여 정보를 주기적으로 갱신합니다.

| 데이터    | 갱신 간격 예시 |
| ------ | -------: |
| 오늘 일정  |       5분 |
| 월간 달력  |       5분 |
| 현재 날씨  |      10분 |
| 시간별 예보 |      10분 |
| 주간예보   |      30분 |

갱신 주기는 각 컴포넌트의 `refetchInterval` 설정을 수정하여 변경할 수 있습니다.

```ts
refetchInterval: 5 * 60 * 1000
```

월간 FullCalendar는 다음 API를 이용하여 일정을 다시 조회할 수 있습니다.

```ts
calendarRef.current?.getApi().refetchEvents();
```

## 디렉터리 구성 예시

```text
app/
├── api/
│   ├── calendar/
│   │   ├── events/
│   │   │   └── route.ts
│   │   └── today/
│   │       └── route.ts
│   ├── google/
│   │   ├── auth/
│   │   │   └── route.ts
│   │   └── callback/
│   │       └── route.ts
│   └── weather/
│       ├── route.ts
│       ├── hourly/
│       │   └── route.ts
│       └── weekly/
│           └── route.ts
├── layout.tsx
├── page.tsx
└── providers.tsx

components/
├── CalendarScreen.tsx
├── DeskDisplay.tsx
├── FlipClockScreen.tsx
├── HourlyWeather.tsx
├── TodaySchedule.tsx
├── WeatherScreen.tsx
└── WeeklyWeather.tsx

lib/
├── google-calendar.ts
├── google-oauth.ts
└── weather/
    ├── kma-hourly.ts
    └── kma-weekly.ts
```

## 슬라이드 구조

세 개의 화면을 가로 방향으로 배치합니다.

```tsx
<div className="flex h-dvh w-dvw snap-x snap-mandatory overflow-x-auto">
  <section className="h-full w-full shrink-0 snap-start">
    <WeatherScreen />
  </section>

  <section className="h-full w-full shrink-0 snap-start">
    <FlipClockScreen />
  </section>

  <section className="h-full w-full shrink-0 snap-start">
    <CalendarScreen />
  </section>
</div>
```

첫 화면이 아닌 가운데 시계 화면에서 시작하도록 초기 스크롤 위치를 조정합니다.

```ts
slider.scrollTo({
  left: slider.clientWidth,
  behavior: "auto",
});
```

## 태블릿에서 사용

Android 태블릿에서는 다음과 같은 방식으로 사용할 수 있습니다.

* Chrome 전체 화면
* 홈 화면에 PWA로 설치
* 키오스크 브라우저 사용
* 화면 자동 꺼짐 비활성화
* Screen Wake Lock API 적용

태블릿이 충전기에 계속 연결된 상태라면 배터리 보호 기능이나 충전 제한 기능을 사용하는 것이 좋습니다.

## 주의사항

### Google Calendar 정보 노출

`/api/calendar/today`와 `/api/calendar/events`가 외부에 공개되면 일정 제목이 노출될 수 있습니다.

외부 서버에 배포할 경우 다음 방법 중 하나를 적용하는 것이 좋습니다.

* 로그인 인증 추가
* 대시보드 전용 비밀번호 적용
* 사설 네트워크에서만 접근
* IP 기반 접근 제한

### 기상청 데이터

단기예보와 중기예보는 발표 시각과 자료 등록 시각 사이에 차이가 있을 수 있습니다. 최신 발표자료를 조회하지 못할 경우 이전 발표 시각의 데이터를 순차적으로 조회하도록 구성합니다.

중기예보는 단기예보보다 넓은 지역을 기준으로 제공되므로, 먼 날짜의 날씨는 실제 설치 장소와 일부 차이가 있을 수 있습니다.

### 환경변수

다음 값은 클라이언트 코드에 직접 노출하지 않습니다.

* Google Client Secret
* Google Refresh Token
* 기상청 API 인증키

모든 외부 API 요청은 Next.js Route Handler를 거쳐 서버에서 처리합니다.

## 향후 개선 사항

* PWA 설치 지원
* 화면 켜짐 유지 기능
* 일정 추가 및 수정 기능
* 날씨 경보 표시
* 미세먼지 정보 표시
* 일출 및 일몰 시각 표시
* 캘린더 선택 기능
* 화면 밝기 자동 조절
* 시간대별 배경 테마 변경
* 태블릿 가로·세로 방향별 반응형 레이아웃
* 설정 화면에서 지역 및 갱신 주기 변경
* Google OAuth 토큰의 데이터베이스 저장
* 다중 사용자 지원

## 라이선스

이 프로젝트는 개인적인 학습 및 태블릿 대시보드 사용을 목적으로 제작되었습니다.

외부 라이브러리와 API 데이터는 각각의 라이선스 및 이용약관을 따릅니다.

- 날씨 데이터: 기상청
- 일정 데이터: Google Calendar API
- 날씨 아이콘: React Icons / Weather Icons