# Stage 1: Builder
FROM --platform=linux/amd64 public.ecr.aws/l8t0j4y9/node-18-alpine:latest AS builder

WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source code
COPY . .

# Build the application (if necessary)
RUN npm run build

# Expose port (optional, if you want it documented)
EXPOSE 3000

# Start the application
CMD ["node", "dist/main"]
