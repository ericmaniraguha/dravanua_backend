# Use Node.js LTS (Long Term Support) image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Expose port (default 8003 from previous context)
EXPOSE 8003

# Command to run the application
CMD ["npm", "start"]
