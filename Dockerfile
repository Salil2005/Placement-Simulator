FROM node:20-alpine AS build

ARG VITE_API_URL=http://localhost:7000
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist

ENV PORT=5002
EXPOSE 5002

CMD ["serve", "-s", "dist", "-l", "5002"]
