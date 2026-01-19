FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate --schema=./apps/api/prisma/schema.prisma

# Development image
FROM base AS development
WORKDIR /app

ENV NODE_ENV=development

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY . .

# Expose port
EXPOSE 3000

# Run migrations and start
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./apps/api/prisma/schema.prisma && npm run dev"]

# Production image
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY . .

# Run migrations and start
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./apps/api/prisma/schema.prisma && npm start"]
