# ── 빌더 ──
FROM node:22-slim AS builder

WORKDIR /app

# Prisma 엔진이 OpenSSL 을 찾는다. slim 이미지에는 없다.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Route Handler 번들을 분석할 때 Prisma 클라이언트가 초기화될 수 있다.
# 빌드 전용 더미이며 런타임 DB 는 compose 가 주입한 DATABASE_URL 을 쓴다.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ── 마이그레이터 ──
# Prisma CLI 는 Next 의 standalone 트레이싱이 못 따라가는 의존성(effect 등)을 쓴다.
# 앱 번들에 섞지 않고 자기 node_modules 를 갖춘 채 따로 둔다.
FROM node:22-slim AS migrator

WORKDIR /migrate
RUN npm install --no-package-lock --omit=dev prisma@7.9.1

# ── 런타임 ──
FROM node:22-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# standalone 산출물에는 트레이싱된 node_modules 가 함께 들어온다.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# 마이그레이션은 컨테이너 기동 시 적용한다. 스키마와 코드가 한 커밋에서 함께
# 배포되므로, 따로 실행하면 둘 사이에 어긋난 순간이 생긴다.
COPY --from=builder /app/prisma ./prisma
COPY --from=migrator /migrate/node_modules /migrate/node_modules

# Prisma 7 은 연결 URL 을 config 파일에서 읽는다. 소스의 prisma.config.ts 는
# TypeScript 라 런타임에 못 쓰므로 같은 내용의 .mjs 를 여기서 만든다.
# CLI 를 /app 에서 실행하므로 여기 두면 자동으로 잡힌다.
RUN printf 'export default { schema: "prisma/schema.prisma", migrations: { path: "prisma/migrations" }, datasource: { url: process.env.DATABASE_URL } };\n' > prisma.config.mjs

EXPOSE 3000

CMD ["sh", "-c", "node /migrate/node_modules/prisma/build/index.js migrate deploy && node server.js"]
