# Use the official Node.js 20 image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps --force

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Start the app
CMD ["sh", "./start.sh"]
