# ==============================================================================
# Stage 1: Build Vite React Frontend Bundle
# ==============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies with lockfile caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy sources and build production assets
COPY . .
RUN npm run build

# ==============================================================================
# Stage 2: Serve with Lightweight Production Nginx
# ==============================================================================
FROM nginx:1.27-alpine AS runner

# Remove default nginx html
RUN rm -rf /usr/share/nginx/html/*

# Copy built distribution files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget -q --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
