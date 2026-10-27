# Stage 1: Build dependencies
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Create execution container (Security hardened)
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY server.js ./

# Run app as non-root user for security compliance
USER node
EXPOSE 8080
ENV PORT=8080
CMD ["node", "server.js"]
