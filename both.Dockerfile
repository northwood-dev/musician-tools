# Multi-stage build: build frontend, then backend, then combine

# 1. Build frontend
FROM node:22-alpine as frontend-builder
WORKDIR /app/client
COPY ./package.json ./package-lock.json* ./
RUN npm ci
COPY ./ .
RUN npm run build

# 2. Build backend
FROM node:22-alpine as backend-builder
WORKDIR /app
COPY ./backend/package.json ./backend/package-lock.json* ./
RUN npm ci --omit=dev
COPY ./backend .

# 3. Final image: combine backend + frontend build
FROM node:22-alpine
WORKDIR /app
# Copy backend
COPY --from=backend-builder /app .
# Copy frontend build into backend public/
COPY --from=frontend-builder /app/client/dist ./public
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "server.js"]
