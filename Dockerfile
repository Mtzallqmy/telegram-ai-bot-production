# Use a Node.js 20 base image
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and yarn.lock (if using yarn) to the working directory
COPY package.json ./ 

# Install dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . . 

# Build the TypeScript project
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the application
CMD ["npm", "start"]
