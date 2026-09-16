# ==========================================
# Multi-Stage Enterprise Dockerfile for Frontend
# Stage 1: Build React + Vite
# Stage 2: Serve with Nginx Alpine + Gzip + Cache + Security
# ==========================================

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build argument for API URL (defaults to /api which is proxied by Nginx)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# Build production bundle
RUN npm run build

# Stage 2: Production Web Server
FROM nginx:alpine

# Install wget for HEALTHCHECK
RUN apk add --no-cache wget

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Healthcheck to verify Nginx serves the home page
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
