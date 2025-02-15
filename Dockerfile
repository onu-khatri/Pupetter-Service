# Install dependencies only when needed
FROM node:20-slim AS deps
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

RUN apt-get update && \
    apt-get install -y libc6 && \
    apt-get install -y git && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./

# try best to skip chromium download with Puppeteer instaltion, comment below to use Puppeteer chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm config set puppeteer_skip_chromium_download true -g

# Install dependecies
RUN npm install --legacy-peer-deps

# Rebuild the source code only when needed
FROM node:20-slim AS builder
WORKDIR /app

COPY . .
COPY --from=deps /app/node_modules ./node_modules
CMD Touch logfile.log
ARG NODE_ENV=production
RUN echo ${NODE_ENV}
RUN NODE_ENV=${NODE_ENV} npm run build

# Production image, copy all the files
FROM node:20-slim AS runner

WORKDIR /app
ENV PPTRUSER_UID=10042

# Create a non-root user
RUN groupadd -r pptruser && useradd -u $PPTRUSER_UID -rm -g pptruser -G audio,video pptruser

# Install Chrome (comment below as If you want to using puppeteer with itself download light weight compitable chrome)
RUN apt-get update && apt-get install -y gnupg wget && \
  wget --quiet --output-document=- https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /etc/apt/trusted.gpg.d/google-archive.gpg && \
  echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list && \
  apt-get update && \
  apt-get install -y google-chrome-stable --no-install-recommends && \
  rm -rf /var/lib/apt/lists/*

# Copy all necessary files used by nex.config as well otherwise the build will fail
COPY --from=builder --chown=pptruser:pptruser /app/dist ./dist
COPY --from=builder --chown=pptruser:pptruser /app/logfile.log ./logfile.log
COPY --from=builder /app/src ./src
COPY --from=builder /app/index.ts ./index.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.ts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.env ./.env

#switch from root to pptruser
USER pptruser

# Expose
EXPOSE 8080 3000
CMD ["node", "dist/src/server.js", "0", "true", "/usr/bin/google-chrome-stable"]
