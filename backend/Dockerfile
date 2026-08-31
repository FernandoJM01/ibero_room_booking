FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache postgresql-client
COPY package.json ./
RUN rm -rf node_modules package-lock.json && \
    npm install --only=production

COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
