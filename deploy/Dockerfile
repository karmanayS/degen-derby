FROM node:20-slim
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --production
COPY scripts/process-claims.js scripts/
CMD ["node", "scripts/process-claims.js"]
