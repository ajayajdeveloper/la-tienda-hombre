# Build from the repo root:  docker build -f apps/web/Dockerfile .

# ---- Stage 1: build the static site ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci -w apps/web --no-audit --no-fund
COPY apps/web ./apps/web
# Empty = call /api on the same origin (nginx proxies it). Override only if
# the API is on another domain.
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build -w apps/web

# ---- Stage 2: serve it with nginx ----
# The final image has no Node, no source and no node_modules: just nginx and
# ~1 MB of static files.
FROM nginx:1.27-alpine
# Files in /etc/nginx/templates are run through envsubst at start-up, so
# ${API_HOST} is filled in from the container's environment.
COPY apps/web/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
# host:port of the API, as seen from this container.
ENV API_HOST=api:4000
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s CMD wget -qO- http://localhost:8080/ >/dev/null || exit 1
