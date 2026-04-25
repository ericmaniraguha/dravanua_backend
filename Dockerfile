# Use ARG for Node version to allow flexibility
ARG NODE_VERSION=20.20-alpine
FROM node:${NODE_VERSION}

# Install curl for healthcheck and other utilities
RUN apk add --no-cache curl tzdata

# Set the working directory
WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install dependencies (use npm ci for faster, more reliable production builds)
# We use npm install if package-lock.json might be out of sync in dev, 
# but for production 'npm ci' is preferred.
RUN npm install --omit=dev

# Copy the rest of the application
COPY . .

# Set permissions for the app user (optional but recommended for production)
# RUN chown -R node:node /app
# USER node

# Expose the internal port (application always listens on 8003 inside container)
EXPOSE 8003

# Command to start the application
CMD ["npm", "start"]
