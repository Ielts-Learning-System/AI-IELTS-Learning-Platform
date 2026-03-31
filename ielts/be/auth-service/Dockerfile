# Use Node.js 20 Alpine as base image for small size
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and yarn.lock (if exists)
COPY package.json yarn.lock* ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Expose port (using environment variable, default 3001)
ARG PORT=3001
ENV PORT=${PORT}
EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + process.env.PORT + '/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the application
CMD ["yarn", "start"]
