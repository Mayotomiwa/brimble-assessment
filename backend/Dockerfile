FROM node:20-slim

# docker CLI binary (docker-container:// transport, no daemon needed)
COPY --from=docker:cli /usr/local/bin/docker /usr/local/bin/docker

# git: cloning repos | railpack: building container images from source
RUN apt-get update && apt-get install -y \
    git \
    curl \
    ca-certificates \
  && curl -fsSL https://raw.githubusercontent.com/railwayapp/railpack/main/install.sh | sh \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm

RUN npm install -g pnpm

WORKDIR /app
COPY package.json ./
RUN pnpm install
COPY . .
RUN pnpm run build

CMD ["node", "dist/main.js"]
