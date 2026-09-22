FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p uploads reports

ENV PORT=7000
EXPOSE 7000

CMD ["node", "server.js"]
