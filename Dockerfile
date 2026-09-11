FROM node:20-alpine

WORKDIR /app

# Install openssl for Prisma engine & libc6-compat
RUN apk add --no-cache openssl libc6-compat

# Copy workspace package definitions and lockfile
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Clean install with lockfile
RUN npm ci

# Copy backend source
COPY backend ./backend

# Generate Prisma client and build typescript
WORKDIR /app/backend
RUN npx prisma generate
RUN npm run build

WORKDIR /app

ENV NODE_ENV=production

EXPOSE 5001

CMD ["node", "backend/dist/index.js"]
