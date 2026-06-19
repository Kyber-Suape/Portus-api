# Portus API

API REST do sistema RDO SUAPE, desenvolvida com Node.js, TypeScript, Express, Prisma e Swagger.

## Tecnologias

- Node.js + TypeScript
- Express
- Prisma + PostgreSQL
- JWT (autenticação)
- Swagger/OpenAPI
- Vitest (testes)
- Docker

## Funcionalidades

- Cadastro de organização + administrador + usuários convidados
- Login e autenticação via JWT
- Sessão (`/auth/me`)
- Gestão de usuários
- Gestão de organização
- Permissões por usuário (catálogo + papéis + overrides)
- Indicadores de dashboard (mockados, base para integrações futuras)
- IA (stub — sugestão de texto e transcrição de áudio, sem provedor externo ainda)
- Documentação interativa via Swagger

## Variáveis de ambiente

Copie `.env.example` para `.env` e ajuste os valores:

```env
PORT=4000
API_PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://portus:portus@localhost:5432/portus_dev?schema=public"
JWT_SECRET="troque-por-uma-string-longa-e-aleatoria"
JWT_EXPIRES_IN="1d"
FRONTEND_URL="http://localhost:3000"
CORS_ORIGIN="http://localhost:3000"
UPLOADS_DIR="uploads"
MAX_UPLOAD_SIZE_MB=25
```

- `PORT` é a porta interna que a API escuta. `API_PORT` é a porta publicada pelo Docker no host — mantenha os dois com o mesmo valor.
- Em produção na VPS usando o Postgres do próprio `docker-compose.yml`, troque o host do `DATABASE_URL` para `postgres` (nome do serviço).
- Só existe este `.env` (fora o `.env.example`). A suíte de testes usa seu próprio banco (`portus_test`) e segredos via `test.env` em `vitest.config.ts` — não depende de um `.env.test` separado.

## Rodando com Docker em desenvolvimento

```bash
docker compose up --build
```

Sobe a API com hot reload (`tsx watch`) e roda as migrations automaticamente. O `docker-compose.override.yml` é aplicado por padrão e não deve ser copiado para a VPS.

## Rodando em produção na VPS

```bash
cp .env.example .env   # ajuste os valores antes de seguir
docker compose -f docker-compose.yml up -d --build
```

Builda a imagem de produção (TypeScript compilado, sem ferramentas de dev) e inicia com `node dist/src/server.js`.

## Prisma

```bash
docker compose exec api npx prisma generate
docker compose exec api npx prisma migrate deploy
```

## Swagger

Após subir a API, acesse:

```txt
http://localhost:4000/api/docs
```

Ajuste a porta conforme o valor definido em `API_PORT`.

## Comandos úteis

```bash
docker compose logs -f api
docker compose down
npm run build
npm run lint
npm run test
```

## Rodando sem Docker

```bash
npm install
cp .env.example .env   # ajuste DATABASE_URL para apontar para um Postgres local
npm run prisma:migrate:dev
npm run prisma:seed
npm run dev
```

## Projeto relacionado

Front-end: [Portus](../Portus/README.md)
