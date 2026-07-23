# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files and install ALL deps (including devDependencies for build)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Production runtime ───────────────────────────────────────────────
FROM node:20-slim AS runner

# Install poppler-utils for PDF-to-image conversion (pdftoppm)
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built output and production deps
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Expose port (DO injects PORT env var, default 5000)
EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "dist/index.cjs"]
