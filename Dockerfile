FROM node:18-bullseye-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
  && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir yt-dlp

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install --production

COPY . .

CMD ["npm", "start"]

