FROM Node:20-slim

RUN apt-get update \
    && apt-get install -yq \
     libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 \
     libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libgconf-2-4 \
     libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libxi-dev libxtst-dev libnspr4 libnss3 libpango-1.0-0 \
     libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 \
     libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 \
     libu2f-udev libvulkan1 libxtst6 lsb-release ca-certificates fonts-liberation xdg-utils\
     curl git unzip wget

# Install Chrome (comment below as we are using puppeteer with itself download light weight compitable chrome)
RUN wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
RUN dpkg -i google-chrome-stable_current_amd64.deb --fix-missing; apt-get -fy install

# Install latest chrome dev package and fonts to support major charsets (Chinese, Japanese, Arabic, Hebrew, Thai and a few others)
RUN apt-get update \
    && apt-get install -y fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-khmeros fonts-kacst fonts-freefont-ttf \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

COPY ./dist /root/export-app/dist
COPY ./src /root/export-app/src
COPY ./index.ts /root/export-app/index.ts
COPY ./tsconfig.json /root/export-app/tsconfig.ts
ADD ./package.json /root/export-app/package.json

WORKDIR /root/export-app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
RUN npm i

EXPOSE 8080 3000
CMD ["node", "dist/src/server.js", "/usr/bin/google-chrome"]
