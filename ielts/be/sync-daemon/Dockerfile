FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY sync-daemon.js .
CMD ["node", "sync-daemon.js"]
