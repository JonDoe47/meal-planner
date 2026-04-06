# Stage 1: 构建前端
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: 后端 + 托管前端
FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --omit=dev
COPY backend/ ./
RUN npx prisma generate
COPY --from=frontend-builder /app/frontend/dist ./public
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push && node src/seed.js && node src/index.js"]
