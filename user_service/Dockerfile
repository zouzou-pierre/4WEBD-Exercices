FROM node:20-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y python3 build-essential pkg-config libsqlite3-dev

COPY package*.json ./
RUN npm install --production

COPY . .

FROM node:20-bookworm-slim
WORKDIR /app

RUN apt-get update && apt-get install -y libsqlite3-0

COPY --from=builder /app /app

EXPOSE 3001
CMD ["node", "index.js"]
