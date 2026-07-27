FROM node:20-slim AS base
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl wget unzip && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

# Скачиваем базу Sypex Geo City (российская GeoIP база, ~12MB)
# Если не удастся — будет использован fallback ip-api.com
RUN mkdir -p /app/data && \
    wget -q -O /tmp/SxGeoCity.zip "https://sypexgeo.net/files/SxGeoCity.zip" 2>/dev/null && \
    unzip -q /tmp/SxGeoCity.zip -d /tmp/sxgeo/ 2>/dev/null && \
    mv /tmp/sxgeo/SxGeoCity.dat /app/data/ 2>/dev/null && \
    rm -rf /tmp/SxGeoCity.zip /tmp/sxgeo && \
    echo "Sypex Geo DB downloaded" || echo "Sypex Geo download failed, will use ip-api.com fallback"

EXPOSE 3001
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss && node dist/main"]
