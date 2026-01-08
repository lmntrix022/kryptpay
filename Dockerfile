# syntax=docker/dockerfile:1.6

ARG NODE_VERSION=22-slim

FROM node:${NODE_VERSION} AS base
WORKDIR /app
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY prisma ./prisma
RUN npm install
RUN npx prisma generate
COPY tsconfig*.json ./

FROM base AS development
ENV NODE_ENV=development
COPY --from=base /app/node_modules ./node_modules
COPY . .
CMD ["npm", "run", "start:dev"]

FROM base AS builder
ENV NODE_ENV=production
COPY . .
RUN npm run build

FROM node:${NODE_VERSION} AS production
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY prisma ./prisma
RUN npm install --omit=dev
RUN npx prisma generate
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/config ./config
CMD ["node", "dist/main.js"]




