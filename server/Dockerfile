FROM node:22-alpine
WORKDIR /app

# install deps first (better layer caching)
COPY package*.json ./
COPY prisma ./prisma
RUN npm install

COPY . .
RUN npx prisma generate && npm run build

EXPOSE 4000
VOLUME ["/app/media"]
ENTRYPOINT ["sh", "docker-entrypoint.sh"]
