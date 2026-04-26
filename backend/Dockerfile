FROM node:20-slim

# git: cloning repos | railpack: building container images from source
RUN apt-get update && apt-get install -y \
    git \
    curl \
    ca-certificates \
  && curl -fsSL https://raw.githubusercontent.com/railwayapp/railpack/main/install.sh | sh \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

CMD ["node", "dist/main.js"]
