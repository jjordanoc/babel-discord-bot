FROM node:18.16

# Install typescript
RUN npm install -g ts-node

RUN npm install -g typescript

# Set working dir
WORKDIR /app

# Copy all neccessary files
COPY package*.json ./
COPY . ./

# Install packages
RUN npm install
RUN npm install typescript@latest

# Compile ts to js
RUN npx tsc --esModuleInterop --module commonjs --moduleResolution node --target es2020 bot.ts commands.ts register.ts createListeningStream.ts

# Run bot
RUN node register.js
CMD ["node", "bot.js"]
