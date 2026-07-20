FROM node:20-slim AS base
WORKDIR /app

# Prisma engine требует OpenSSL — на node:20-alpine с этим часто проблемы
# (несовпадение версий musl/openssl), поэтому используем Debian-based slim-образ.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3001
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss && node dist/main"]
