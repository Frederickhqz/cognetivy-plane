# Build stage with Node 20
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first
COPY package*.json ./
COPY cli/package*.json ./cli/
COPY studio/package*.json ./studio/

# Copy source code
COPY cli ./cli
COPY studio ./studio

# Build CLI
WORKDIR /app/cli
RUN npm ci && npm run build

# Build Studio
WORKDIR /app/studio
RUN npm ci && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built CLI
COPY --from=builder /app/cli/dist ./cli/dist
COPY --from=builder /app/cli/package.json ./cli/
COPY --from=builder /app/cli/node_modules ./cli/node_modules

# Copy built Studio
COPY --from=builder /app/studio/dist ./studio/dist
COPY --from=builder /app/studio/package.json ./studio/

# Install serve for static files
RUN npm install -g serve

# Create workspace directory
RUN mkdir -p /app/workspace/.cognetivy

# Set environment
ENV COGNETIVY_WORKSPACE=/app/workspace

WORKDIR /app/studio

# Expose Studio port
EXPOSE 4173

# Start command - serve static files
CMD ["serve", "-s", "dist", "-l", "4173"]