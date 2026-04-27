FROM node:20-slim

# git: cloning repos | railpack: building container images from source
RUN apt-get update && apt-get install -y \
    git \
    curl \
    ca-certificates \
  && curl -fsSL https://raw.githubusercontent.com/railwayapp/railpack/main/install.sh | sh \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm

WORKDIR /app
COPY package.json ./
RUN pnpm install
COPY . .
RUN pnpm run build

CMD ["node", "dist/main.js"]
