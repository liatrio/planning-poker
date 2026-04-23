# Planning Poker - Single Container Dockerfile
# Runs both the Node.js server and Nginx serving the React client

FROM node:20-alpine AS builder

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Force dev mode in the builder stage. If NODE_ENV=production leaks in from the
# host (common on Windows/CI), npm will silently skip devDependencies like
# typescript, producing `sh: tsc: not found`.
ENV NODE_ENV=development

WORKDIR /app

# Copy package files including lockfile
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install all dependencies across all workspaces, dev included.
RUN npm ci --include=dev --workspaces --include-workspace-root

# Fail fast with a useful message if typescript didn't land, so downstream
# `tsc: not found` errors don't mask the real cause.
RUN test -x node_modules/.bin/tsc || (echo "ERROR: typescript was not installed. Check NODE_ENV and package-lock.json." && ls node_modules/.bin | head -40 && exit 1)

# Copy source code
COPY server ./server
COPY client ./client

# Build both workspaces from the repo root. Running via --workspace keeps npm
# in the root context so `tsc` (hoisted into /app/node_modules/.bin) is always
# found, even when workspace symlinks are flaky (e.g. Windows → WSL2 Docker).
RUN npm run build --workspace=server
RUN npm run build --workspace=client

# Production stage
FROM node:20-alpine

# Install nginx and OpenSSL for Prisma
RUN apk add --no-cache nginx openssl

WORKDIR /app

# Copy server package files and built code
COPY --from=builder /app/server/package.json ./server/
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/prisma ./server/prisma

# Install only production dependencies for server
WORKDIR /app/server
RUN npm install --production

# Generate Prisma client
RUN npx prisma generate

# Copy built client files to nginx html directory
COPY --from=builder /app/client/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/http.d/default.conf

# Create nginx run directory
RUN mkdir -p /run/nginx

# Copy startup script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Expose port 80
EXPOSE 80

# Set working directory back to app root
WORKDIR /app

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# Run the startup script
ENTRYPOINT ["/app/docker-entrypoint.sh"]
