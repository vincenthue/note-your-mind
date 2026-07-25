# Backend Dockerfile
FROM node:20-bullseye-slim

WORKDIR /app

# Install build dependencies for sqlite3
RUN apt-get update && \
    apt-get install -y python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Fresh install inside Docker (Linux build)
RUN npm install --build-from-source

# Copy all backend files (excluding node_modules via .dockerignore)
COPY . .

# Remove any Windows-compiled node_modules that got copied
RUN rm -rf node_modules && npm install --build-from-source

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
