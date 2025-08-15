# Dockerfile
FROM node:20-alpine
WORKDIR /app

# copy everything (tiny app, no deps)
COPY . .

ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "index.js"]
