FROM node:20-slim AS builder
WORKDIR /app

# NEXT_PUBLIC_* переменные Next.js встраивает В СБОРКУ (build time), а не
# читает в рантайме — поэтому передаём как build-arg, а не просто env контейнера.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

ARG NEXT_PUBLIC_METRIKA_ID
ENV NEXT_PUBLIC_METRIKA_ID=${NEXT_PUBLIC_METRIKA_ID}

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
