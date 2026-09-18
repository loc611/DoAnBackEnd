# ==========================================
# Multi-Stage Enterprise Dockerfile for Backend
# Base: Node.js 22 Alpine (Small, Secure, Optimized)
# ==========================================

# Stage 1: Build & Dependencies
FROM node:22-alpine AS builder

WORKDIR /app

# Install OpenSSL and libc6-compat for Prisma Query Engine on Alpine
RUN apk add --no-cache openssl libc6-compat

# Copy package descriptors first to maximize Docker layer caching
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Generate Prisma Client for linux-musl-openssl-3.0.x
RUN npx prisma generate

# Copy the rest of the source code
COPY . .

# Stage 2: Production Runner
FROM node:22-alpine AS runner

WORKDIR /app

# Security & runtime tools:
# - openssl & libc6-compat: required for Prisma Query Engine
# - ca-certificates: required for secure TLS connection to Cloud Neon DB
# - dumb-init: handles PID 1 signals (SIGTERM, SIGINT) for graceful shutdown
# - wget: used by Docker HEALTHCHECK
RUN apk add --no-cache openssl libc6-compat ca-certificates dumb-init wget

ENV NODE_ENV=production
ENV PORT=5000

# Create app directory with non-root ownership
RUN mkdir -p /app && chown -R node:node /app

# Copy built node_modules with pre-generated Prisma client
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/prisma.config.ts ./
COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/server.js ./
COPY --from=builder --chown=node:node /app/prismaClient.js ./
COPY --from=builder --chown=node:node /app/seeder.js ./
COPY --from=builder --chown=node:node /app/controllers ./controllers
COPY --from=builder --chown=node:node /app/routes ./routes
COPY --from=builder --chown=node:node /app/middlewares ./middlewares
COPY --from=builder --chown=node:node /app/middleware ./middleware
COPY --from=builder --chown=node:node /app/services ./services
COPY --from=builder --chown=node:node /app/utils ./utils
COPY --from=builder --chown=node:node /app/policies ./policies
COPY --from=builder --chown=node:node /app/config ./config
COPY --from=builder --chown=node:node /app/scripts ./scripts

# Run as non-root user for enterprise container security
USER node

EXPOSE 5000

# Healthcheck to verify the server is healthy
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "server.js"]