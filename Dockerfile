FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

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
RUN if [ "$BUILD_MODE" = "uat" ]; then npm run build:uat; else npm run build; fi

FROM nginx:1.27-alpine AS final
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
