# Stage 1: Builder
FROM --platform=linux/amd64 public.ecr.aws/l8t0j4y9/node-18-alpine:latest AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including devDeps for TypeScript)
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build the application (compile TypeScript to dist/)
RUN npm run build

# Stage 2: Production
FROM --platform=linux/amd64 public.ecr.aws/l8t0j4y9/node-18-alpine:latest AS production

# Create app user
RUN addgroup -g 1001 -S nodejs \
 && adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the application (dist already built)
CMD ["node", "dist/index.js"]
