FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
# KOSONG = same-origin lewat nginx (path di kode sudah /api/v1/...).
# Jangan diisi "/api" (menghasilkan /api/api/v1/...). Dev lokal: http://localhost:8000
ARG NEXT_PUBLIC_API_URL=
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
# Port http Next.js di dalam container (default 3002).
# Dapat di-override saat build: --build-arg FRONTEND_PORT=3005
# atau saat runtime lewat environment PORT (dibaca server.js standalone).
ARG FRONTEND_PORT=3002
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=${FRONTEND_PORT} \
    HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE ${FRONTEND_PORT}
CMD ["node", "server.js"]
