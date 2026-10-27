# 14-Docker: Complete Enterprise Implementation & Theory

## 1. Deep Theory: How Docker Actually Works
Docker is not a Virtual Machine. It does not run a Guest OS. It uses Linux Kernel features:
- **Namespaces:** Provide isolation (PID, NET, IPC, MNT, UTS). When you run a container, Docker creates a set of namespaces for it.
- **Control Groups (cgroups):** Provide resource limits. They restrict how much CPU and RAM a container can use.
- **Union File Systems (UnionFS):** The building blocks of containers. It allows files and directories of separate file systems (branches) to be transparently overlaid, forming a single coherent file system.

## 2. Advanced Multi-Stage Dockerfile (Node.js + Production Optimized)
Here is a "crazy" detailed, production-ready Dockerfile for a Node.js web app.

```dockerfile
# STAGE 1: Build Stage
# We use a specific, slim version of Node to ensure deterministic builds.
FROM node:18.17.0-alpine3.18 AS builder

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy ONLY package.json and package-lock.json first to leverage Docker layer caching.
# If these don't change, Docker skips `npm ci` on future builds.
COPY package*.json ./

# Install exact dependencies using 'ci' (clean install) for deterministic, secure builds.
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application (e.g., TypeScript compilation, Webpack bundling)
RUN npm run build


# STAGE 2: Production Stage
FROM node:18.17.0-alpine3.18

# Set Node environment to production (disables devDependencies, enables caching)
ENV NODE_ENV production

# Create a non-root user and group for security. 
# Running as root inside a container is a massive security risk.
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeapp -u 1001 -G nodejs

WORKDIR /usr/src/app

# Copy ONLY the necessary built artifacts and production node_modules from the builder stage
COPY --from=builder --chown=nodeapp:nodejs /usr/src/app/dist ./dist
COPY --from=builder --chown=nodeapp:nodejs /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=nodeapp:nodejs /usr/src/app/package.json ./

# Switch to the non-root user
USER nodeapp

# Expose the application port
EXPOSE 3000

# Use a strict JSON array for CMD to prevent the shell from intercepting signals (like SIGTERM)
CMD ["node", "dist/server.js"]
```

## 3. Step-by-Step Implementation Commands
To actually build and run this enterprise Dockerfile:

```bash
# 1. Build the image, tagging it as 'myapp', targeting the production stage
docker build -t myapp:v1.0.0 --target production .

# 2. Inspect the image size and layers to ensure it's optimized
docker history myapp:v1.0.0

# 3. Run the container securely, mounting a read-only volume and limiting CPU/RAM
docker run -d \
  --name myapp-prod \
  -p 80:3000 \
  --memory="512m" \
  --cpus="0.5" \
  --read-only \
  --tmpfs /tmp \
  myapp:v1.0.0

# 4. View real-time resource consumption (CPU, RAM, Network I/O)
docker stats myapp-prod
```
