FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY app/package*.json ./

# Install dependencies
RUN npm install --production

# Copy all application code including subdirectories
COPY app/ ./

# Expose port
EXPOSE 4000

CMD ["node", "index.js"]