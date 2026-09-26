FROM node:24-alpine
WORKDIR /app
COPY package.json ./
COPY server/multiplayer/package*.json ./server/multiplayer/
RUN npm ci --prefix server/multiplayer --omit=dev --ignore-scripts
COPY server/social-access.mjs ./server/
COPY server/multiplayer/*.mjs ./server/multiplayer/
COPY js/museum/social-model.js ./js/museum/
USER node
EXPOSE 2567
CMD ["node","server/multiplayer/start.mjs"]
