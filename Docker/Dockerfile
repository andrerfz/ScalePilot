FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy all application files from the app directory
COPY app/ ./

# Expose port
EXPOSE 4000

CMD ["node", "index.js"]