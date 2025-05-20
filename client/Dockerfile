FROM node:18-alpine

WORKDIR /usr/src/app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Create .env file with environment variables
RUN echo "GOOGLE_WEB_CLIENT_ID=816779798174-1431kc4pg7opl4m8jc4u7pmt66q1brmb.apps.googleusercontent.com\n\
GOOGLE_ANDROID_CLIENT_ID=816779798174-d1fn4e5vdpi4hjqovgusnd7qhavloimf.apps.googleusercontent.com\n\
GOOGLE_IOS_CLIENT_ID=816779798174-7njrlf8e8lh5fba07ut5ucndehqj64o6.apps.googleusercontent.com\n\
API_URL=http://52.221.253.61:5000/api/v1" > .env

# Build web version
RUN npx expo export

# Expose port
EXPOSE 3000

# Install serve to host the static files
RUN npm install -g serve

# Create a health check file
RUN echo "OK" > ./dist/health

# Start the server
CMD ["serve", "-s", "dist", "-l", "3000"] 