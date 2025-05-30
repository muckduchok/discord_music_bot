FROM node:18-bullseye

# Устанавливаем ffmpeg в контейнер
RUN apt-get update && apt-get install -y ffmpeg

WORKDIR /bot
COPY package*.json ./
RUN npm ci --production
COPY . .

CMD ["npm", "start"]
