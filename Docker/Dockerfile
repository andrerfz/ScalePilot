FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package.json from the correct location
COPY package.json ./

# Install dependencies
RUN npm install --production

# Copy application code
COPY app/ ./

EXPOSE 4000

CMD ["node", "index.js"]