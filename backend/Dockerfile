FROM node:18-slim

# Install Chrome dependencies
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" | tee /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source
COPY . .

# Create data directory with correct permissions
RUN mkdir -p /app/data \
    && chown -R pptruser:pptruser /app

# Run everything after as non-privileged user
USER pptruser

EXPOSE 8000
CMD [ "npm", "start" ]
