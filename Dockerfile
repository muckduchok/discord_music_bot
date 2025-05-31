FROM node:18-bullseye-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./

RUN npm install --production

COPY . .

EXPOSE 80

CMD ["npm", "start"]
