FROM node:24.13.1-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .

ARG STAGING_SUPABASE_PROJECT_REF
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SENTRY_DSN=""
ENV VITE_APP_ENV=staging \
    VITE_ENABLE_DEMO_MODE=false \
    VITE_SUPABASE_URL=${VITE_SUPABASE_URL} \
    VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY} \
    VITE_SENTRY_DSN=${VITE_SENTRY_DSN}

RUN test -n "$STAGING_SUPABASE_PROJECT_REF" \
    && test "$VITE_SUPABASE_URL" = "https://${STAGING_SUPABASE_PROJECT_REF}.supabase.co" \
    && test -n "$VITE_SUPABASE_ANON_KEY" \
    && npm run build \
    && npm run verify:bundle

FROM nginx:stable-alpine AS runtime
COPY deploy/staging/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
