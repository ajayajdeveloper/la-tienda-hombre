# Build from the repo root:  docker build -f apps/api/Dockerfile .
# (The root package-lock.json pins every dependency for the whole workspace.)

# ---- Stage 1: install production dependencies only ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# npm ci = exact versions from the lockfile; -w = only the API's dependencies;
# --omit=dev = no supertest etc. in the production image.
RUN npm ci -w apps/api --omit=dev --no-audit --no-fund

# ---- Stage 2: the runtime image ----
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app ./
COPY apps/api ./apps/api

# Don't run as root: a compromised process can't touch the rest of the container.
USER node
WORKDIR /app/apps/api
EXPOSE 4000

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/healthz || exit 1

# Migrate, then start. Safe with several replicas: migrate.js takes a Postgres
# advisory lock, so only one container applies migrations at a time.
# `exec` makes node PID 1 so it receives SIGTERM directly (graceful shutdown).
CMD ["sh", "-c", "node src/db/migrate.js && exec node src/server.js"]
