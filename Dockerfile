# Define Node Version Argument (defaults to 20.20-alpine if not provided)
ARG NODE_VERSION=20.20-alpine
FROM node:${NODE_VERSION}

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
