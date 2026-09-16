# The production executor is intended to run directly on the Docker host.
# Keeping the executor outside a container avoids exposing /var/run/docker.sock
# to another container. Use this file only for development image experiments.
FROM node:20-bookworm-slim
WORKDIR /app
COPY package.json server.js ./
RUN useradd --system --create-home --uid 10001 mastermind-runtime
USER mastermind-runtime
EXPOSE 8787
CMD ["node", "server.js"]
