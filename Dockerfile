FROM node:22-alpine AS source
WORKDIR /app

# Headless Chromium for scripts/prerender-body.mjs, which renders the public marketing pages into the
# build output so crawlers read real page text. If it is missing or fails, the build still succeeds
# and those pages keep their metadata-only HTML.
RUN apk add --no-cache chromium
ENV PRERENDER_CHROME=/usr/bin/chromium-browser

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Jenkins quality gate. Building this target sends the checked-out repository as
# Docker build context, which also works when Jenkins itself runs in a container
# and its workspace path is not bind-mountable by the host Docker daemon.
FROM source AS test
RUN npm run config:audit && npm run routes:audit && npm run lint && npm test -- --run

# Browser-level quality gate. The official image contains the exact Chromium/system
# libraries Playwright needs; Alpine cannot run the supported browser build reliably.
FROM mcr.microsoft.com/playwright:v1.65.1-noble AS e2e
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run config:audit && npm run routes:audit && npm run lint && npm test -- --run && npm run test:e2e

FROM source AS build

# VITE_* configuration comes from a Vite mode file (.env.production or .env.uat),
# baked into the bundle by `vite build`. Don't reintroduce blanket ARG/ENV VITE_*
# lines here: an empty environment variable overrides the .env file in Vite and
# silently switches the app into demo mode.
#
# BUILD_MODE picks which one -- "production" (default) or "uat". Explicitly passed
# by whichever Jenkins pipeline builds this image (--build-arg BUILD_MODE=uat for
# the UAT job); defaults to production so a plain `docker build` with no arg at all
# still ships the real prod config, never something wrong by omission.
#
# This used to be handled by keeping .env.production's own content DIFFERENT between
# the main and uat branches (uat's copy pointed at uatapi.thereadernest.in). That's
# what actually broke: `git merge origin/main` has no way to know one file is meant
# to diverge by branch, so a routine "pull main into uat" silently overwrote uat's
# own API URL with main's -- confirmed live, the deployed UAT site started calling
# the real production API. BUILD_MODE fully decouples the two: .env.production can
# now be byte-identical on every branch (it only ever holds the real prod URL), and
# UAT's own config lives in its own file (.env.uat) that main never touches at all.
ARG BUILD_MODE=production
ARG RELEASE_VERSION=local
ARG GIT_COMMIT=unknown
RUN if [ "$BUILD_MODE" = "uat" ]; then npm run build:uat; else npm run build; fi
# A tiny immutable deployment fingerprint lets Jenkins and support verify that the
# container serving traffic is the commit that passed the quality gate.
RUN printf '{"version":"%s","commit":"%s"}\n' "$RELEASE_VERSION" "$GIT_COMMIT" > /app/dist/release.json

FROM nginx:1.27-alpine AS final
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
# nginx has separate host-based virtual servers. Probe the production virtual host
# explicitly; a bare 127.0.0.1 request selects the www redirect server and can follow
# that redirect through the public reverse proxy, reporting a false 502 during deploys.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -q --header='Host: meettomanage.cloud' -O /dev/null http://127.0.0.1/release.json || exit 1
EXPOSE 80
