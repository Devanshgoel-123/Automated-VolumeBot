FROM --platform=linux/amd64 public.ecr.aws/l8t0j4y9/node-18-alpine:latest

WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if exists)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source code
COPY . .

# Build the application (compile TypeScript to dist/)
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]
