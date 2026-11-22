FROM node:26-slim

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY dist ./

# Logs are written to ./data relative to the working directory, so the node user needs it.
RUN mkdir -p data && chown node:node data

USER node
CMD ["node", "./main.js"]
