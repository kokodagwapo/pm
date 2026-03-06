# PropertyPro - Next.js app (full image for seed + start)
FROM node:20-alpine AS base
WORKDIR /app

# Install deps
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# Build (MONGODB_URI needed at build time for Next.js page data collection)
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Placeholders so Next.js build (page data collection) can run
ENV MONGODB_URI=mongodb://localhost:27017/propertypro
ENV STRIPE_SECRET_KEY=sk_docker_build_placeholder
ENV STRIPE_WEBHOOK_SECRET=whsec_docker_build_placeholder
RUN npm run build

# Runner: keep node_modules so we can run seed (tsx) then next start
FROM base AS runner
RUN apk add --no-cache netcat-openbsd
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENTRYPOINT ["./docker-entrypoint.sh"]
