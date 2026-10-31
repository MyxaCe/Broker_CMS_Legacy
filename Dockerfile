# Broker CMS — production-образ (Next standalone + Payload).
# Сборка: docker compose build cms   (или docker build -t broker-cms .)

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# На этапе сборки БД не нужна: страницы админки динамические
ENV BUILD_STANDALONE=1
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# Образ миграций (`broker-cms-migrate`, цель `build` в publish-images.yml)
# запускается ИМЕННО с этой стадии. Команда обязана стоять явно.
#
# Урок CMS-28 / Р-404 — класс «молчаливый успех». Без этой строки у стадии
# нет своего CMD, и действует умолчание базового образа `node:22-alpine` —
# голый `node`: он поднимает REPL, читает конец ввода и выходит кодом 0.
# То есть образ миграций, запущенный как опубликован, НЕ ДЕЛАЕТ НИЧЕГО и
# отчитывается успехом. Для миграций это самый дорогой исход: `cms` ждёт
# мигратор через `service_completed_successfully` и поднимается поверх
# ПУСТОЙ базы — ровно B-OPS-001, месяц «нерабочего контура».
#
# `payload migrate` закрывает все три двери разом:
#   — применяет миграции по-настоящему при запуске;
#   — при ошибке конфигурации (нет DATABASE_URL и пр.) падает НАЗВАННО:
#     ненулевой код и собственное сообщение payload, а не тихий ноль;
#   — «применено 0, всё уже накатано» payload печатает и выходит 0 — и это
#     больше не спутать с «не запускали вовсе»: у того вывод был пуст.
#
# Боевой `command:` в compose перекрывает CMD связкой `migrate && seed`
# (CMD, не ENTRYPOINT — чтобы это перекрытие работало). Этот CMD — корректное
# умолчание самого образа и второй рубеж, а не единственный.
CMD ["pnpm", "payload", "migrate"]

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 payload

COPY --from=build --chown=payload:nodejs /app/.next/standalone ./
COPY --from=build --chown=payload:nodejs /app/.next/static ./.next/static
# Контракт нужен в рантайме: ajv-валидация ответов читает contract/json-schema
COPY --from=build --chown=payload:nodejs /app/contract ./contract

# Каталог медиа (подключается volume'ом)
RUN mkdir -p /app/media && chown payload:nodejs /app/media

USER payload

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
