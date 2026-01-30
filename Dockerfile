# Planning Poker - Single Container Dockerfile
# Runs both the Node.js server and Nginx serving the React client

FROM node:20-alpine AS builder

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files including lockfile
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install all dependencies (workspaces)
RUN npm ci

# Copy source code
COPY server ./server
COPY client ./client

# Build server
WORKDIR /app/server
RUN npm run build

# Build client
WORKDIR /app/client
RUN npm run build

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
