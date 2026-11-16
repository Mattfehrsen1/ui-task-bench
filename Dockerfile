# Reproducible grading environment: the Playwright image pins the browser build and the
# system fonts that reference.png screenshots depend on.
FROM mcr.microsoft.com/playwright:v1.63.0-noble

WORKDIR /bench
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

CMD ["npm", "run", "verify"]
