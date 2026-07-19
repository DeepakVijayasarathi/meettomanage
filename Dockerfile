FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# VITE_* configuration comes from .env.production (baked into the bundle by
# `vite build`). Don't reintroduce blanket ARG/ENV VITE_* lines here: an empty
# environment variable overrides the .env file in Vite and silently switches
# the app into demo mode.
RUN npm run build

FROM nginx:1.27-alpine AS final
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
