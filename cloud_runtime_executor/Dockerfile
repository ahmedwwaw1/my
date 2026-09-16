FROM node:20-bookworm-slim
RUN apt-get update \
  && apt-get install -y --no-install-recommends docker.io ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json server.js ./
USER node
EXPOSE 8787
CMD ["node", "server.js"]
