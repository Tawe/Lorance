# Frontend Dockerfile
FROM node:18-alpine AS deps

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
USER nodejs

# Copy built files
COPY --from=builder /app/.next ./app
COPY --from=builder /app/public ./app/public
COPY --from=builder /app/package*.json ./

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Start the application
CMD ["npm", "start"]