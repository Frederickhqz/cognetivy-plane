# Build stage with Node 20
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY cli/package*.json ./cli/
COPY studio/package*.json ./studio/
COPY package*.json ./

# Install CLI dependencies
WORKDIR /app/cli
RUN npm ci

# Build CLI
RUN npm run build

# Install Studio dependencies
WORKDIR /app/studio
RUN npm ci

# Build Studio
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built CLI
COPY --from=builder /app/cli/dist ./cli/dist
COPY --from=builder /app/cli/package.json ./cli/

# Copy built Studio
COPY --from=builder /app/studio/dist ./studio/dist
COPY --from=builder /app/studio/package.json ./studio/

# Create workspace directory
RUN mkdir -p /app/workspace/.cognetivy

# Set environment
ENV COGNETIVY_WORKSPACE=/app/workspace

WORKDIR /app

# Expose Studio port
EXPOSE 4173

# Start command - Studio preview
CMD ["npx", "vite", "preview", "--port", "4173", "--host"]