FROM node:18-alpine

WORKDIR /bot

# Копируем только манифесты, чтобы закешировать npm install
COPY package.json package-lock.json ./
RUN npm ci --production

COPY . .

CMD ["npm", "start"]
