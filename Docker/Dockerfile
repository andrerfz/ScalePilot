FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install --production

# Copy application code - copy directly to working directory
COPY app/* ./

# Set the correct entry point - no subdirectory
EXPOSE 4000

CMD ["node", "index.js"]