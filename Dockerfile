FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm ci
COPY . .
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node","index.js"]
