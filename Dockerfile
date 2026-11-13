FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends curl unzip ca-certificates && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://dl.google.com/android/repository/platform-tools_r37.0.1-linux.zip -o /tmp/platform-tools.zip \
    && echo "d230f13842f60f782a8645f9c813f8f845bf36089ea7289f28c48f17979313f1  /tmp/platform-tools.zip" | sha256sum -c - \
    && unzip -q /tmp/platform-tools.zip -d /opt/android \
    && ln -s /opt/android/platform-tools/adb /usr/local/bin/adb \
    && rm /tmp/platform-tools.zip \
    && adb version
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY server.mjs ./
COPY src ./src
COPY scripts/database-backup.mjs ./scripts/database-backup.mjs
COPY motor/scrcpy-server ./motor/scrcpy-server
RUN mkdir -p /data /home/node/.android && chown node:node /data /home/node/.android
USER node
ENV HOST=0.0.0.0 PORT=4317 ZYNER_DATA_DIR=/data HOME=/home/node
EXPOSE 4317
VOLUME ["/data", "/home/node/.android"]
CMD ["node", "server.mjs"]
