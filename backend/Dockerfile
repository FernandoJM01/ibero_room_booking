FROM node:20-alpine
WORKDIR /app

COPY package.json ./
RUN rm -rf node_modules package-lock.json && \
    npm install --only=production

COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
