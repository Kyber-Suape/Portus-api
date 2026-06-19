# syntax=docker/dockerfile:1

# ---- deps: instala todas as dependências (cache reaproveitado entre estágios) ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---- dev: imagem usada pelo docker-compose.override.yml (hot reload) ----
FROM deps AS dev
WORKDIR /app
COPY . .
RUN npx prisma generate
EXPOSE 4000
CMD ["sh", "-c", "npm run prisma:migrate:deploy && npm run dev"]

# ---- build: compila TypeScript -> dist e gera o Prisma Client ----
FROM deps AS build
WORKDIR /app
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- production: apenas dependências de produção + artefatos compilados ----
FROM node:22-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

RUN mkdir -p uploads && chown -R node:node /app
USER node

EXPOSE 4000
CMD ["node", "dist/src/server.js"]
