FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG PORT=3008
ENV PORT=${PORT}
EXPOSE ${PORT}

CMD ["npm", "start"]
