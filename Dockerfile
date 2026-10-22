# Nano Banana — production image with FFmpeg for long-video assembly.
# Build:  docker build -t nano-banana .
# Run:    docker run -p 3000:3000 --env-file .env nano-banana
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
# FFmpeg is required for multi-scene video assembly (ENABLE_FFMPEG=true)
RUN apk add --no-cache ffmpeg
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache ffmpeg && mkdir -p /app/storage && chown node:node /app/storage
ENV NODE_ENV=production ENABLE_FFMPEG=true NEXT_TELEMETRY_DISABLED=1
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/scripts ./scripts
COPY --from=builder --chown=node:node /app/db ./db
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null 2>&1 || exit 1
# Applies Wesh IA Star's own database schema (idempotent) to DATABASE_URL, then
# starts the app. No Supabase project/CLI is involved.
CMD ["sh", "-c", "node scripts/migrate.js && npm start"]
