# syntax=docker/dockerfile:1

ARG NODE_VERSION=24.13.0-slim

# --------------------------------------------------
# 1. 공통 베이스
# --------------------------------------------------
FROM node:${NODE_VERSION} AS base

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# Node 24에는 Corepack이 포함되어 있으므로 pnpm을 활성화
RUN corepack enable


# --------------------------------------------------
# 2. 의존성 설치
# --------------------------------------------------
FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm --version
RUN pnpm install --frozen-lockfile


# --------------------------------------------------
# 3. Next.js 빌드
# --------------------------------------------------
FROM base AS builder

ENV NODE_ENV=production

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN pnpm build


# --------------------------------------------------
# 4. 실제 실행 이미지
# --------------------------------------------------
FROM node:${NODE_VERSION} AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Next.js 런타임 캐시 디렉터리
RUN mkdir -p .next && chown node:node .next

# PWA 아이콘 등의 정적 파일
COPY --from=builder --chown=node:node /app/public ./public

# standalone 서버
COPY --from=builder --chown=node:node \
  /app/.next/standalone ./

# Next.js 정적 번들
COPY --from=builder --chown=node:node \
  /app/.next/static ./.next/static

USER node

EXPOSE 3000

CMD ["node", "server.js"]