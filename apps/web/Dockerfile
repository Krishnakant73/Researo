# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Researo web (Next.js 15) — multi-stage production image.
#
# NEXT_PUBLIC_API_URL is baked into the client bundle at build time, so it
# must be supplied as a build ARG (Railway: set it as a build variable).
# ---------------------------------------------------------------------------

# --- deps: install node_modules (cached unless lockfile changes) ----------
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- builder: compile the Next.js app -------------------------------------
FROM node:20-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Public API base URL — must be known at build time for the client bundle.
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# --- runner: minimal runtime image ----------------------------------------
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Standalone output + static assets + public dir.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# server.js honours $PORT (injected by Railway).
CMD ["node", "server.js"]
