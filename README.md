# Portus API

API do Portus RDO: cadastro transacional de organização + Administrador do Sistema + usuários convidados, login/sessão, permissões granulares por papel (`feature:action`), perfil autenticado, dados da organização e a feature completa de **RDO** (Relatório Diário de Obra) — criação em rascunho, edição por seção, fluxo de envio → revisão externa → revisão SUAPE → aprovação, evidências com geolocalização, histórico de status, comentários e sugestão de texto/transcrição de áudio via IA (stub). Base para evoluir depois para obras/contratos reais, permissões por obra/contrato, assinatura eletrônica, PDFs, offline/sincronização, IA real e mapas/GIS.

Stack: Node.js + TypeScript + Express + Prisma + PostgreSQL + JWT + Zod + Multer + Swagger/OpenAPI. Testes com Vitest + Supertest.

## Pré-requisitos

- Node.js 22+
- Docker Desktop (para o PostgreSQL local)

## Instalação

```bash
cp .env.example .env
cp .env.test.example .env.test   # ajuste se necessário; aponta para o banco portus_test

docker compose up -d postgres     # sobe o Postgres (cria portus_dev e, no primeiro boot, portus_test)

npm install
npm run prisma:migrate:dev        # cria/aplica as migrations em portus_dev
npm run prisma:seed               # popula dados de demonstração

npm run dev                       # http://localhost:4000
```

Swagger/OpenAPI disponível em **http://localhost:4000/api/docs** (spec bruta em `/api/docs.json`).

## Variáveis de ambiente

| Variável | Descrição | Default |
| --- | --- | --- |
| `PORT` | Porta HTTP da API | `4000` |
| `NODE_ENV` | `development` \| `test` \| `production` | `development` |
| `DATABASE_URL` | Connection string do Postgres | — (obrigatório) |
| `JWT_SECRET` | Segredo usado para assinar os tokens JWT | — (obrigatório) |
| `JWT_EXPIRES_IN` | Validade do token (ex.: `1d`, `1h`) | `1d` |
| `FRONTEND_URL` | URL do front (`portus`) | `http://localhost:3000` |
| `CORS_ORIGIN` | Origem liberada no CORS (default = `FRONTEND_URL`) | — |
| `UPLOADS_DIR` | Diretório onde evidências de RDO são salvas em disco (nunca servido como estático) | `uploads` |
| `MAX_UPLOAD_SIZE_MB` | Tamanho máximo por arquivo enviado (evidências/áudio) | `25` |


`.env.test` usa as mesmas variáveis, apontando `DATABASE_URL`/`TEST_DATABASE_URL` para o banco `portus_test` e `UPLOADS_DIR` para `uploads-test` — nunca para `portus_dev`/`uploads`.

## Scripts

| Script | Descrição |
| --- | --- |
| `npm run dev` | Inicia em modo desenvolvimento (`tsx watch`) |
| `npm run build` | Compila para `dist/` |
| `npm start` | Roda a build (`dist/server.js`) |
| `npm run lint` | ESLint |
| `npm test` | Roda toda a suíte de testes (`NODE_ENV=test`, banco `portus_test`) |
| `npm run test:watch` | Vitest em modo watch |
| `npm run test:unit` | Apenas testes unitários |
| `npm run test:integration` | Apenas testes de integração (HTTP + banco) |
| `npm run test:coverage` | Testes com relatório de cobertura |
| `npm run prisma:generate` | Gera o Prisma Client |
| `npm run prisma:migrate` / `prisma:migrate:dev` | Cria/aplica migrations em desenvolvimento |
| `npm run prisma:migrate:test` | Aplica migrations no banco de teste (via `.env.test`) |
| `npm run prisma:migrate:deploy` | Aplica migrations em produção (sem gerar novas) |
| `npm run prisma:seed` / `npm run seed` | Popula dados de demonstração (bloqueado em produção) |
| `npm run prisma:studio` | Abre o Prisma Studio |

## Testes

A suíte nunca roda contra `portus_dev`. `tests/helpers/databaseTestHelper.ts` recusa limpar o banco se `NODE_ENV !== "test"` ou se `DATABASE_URL` não corresponder a `TEST_DATABASE_URL`.

```bash
docker compose up -d postgres
cp .env.test.example .env.test     # se ainda não existir
npm run prisma:migrate:test
npm test                            # ou npm run test:coverage
```

Cobertura mínima configurada em `vitest.config.ts`: statements 70% · branches 60% · functions 70% · lines 70%.

Estrutura: `tests/factories` (dados de teste), `tests/helpers` (app de teste, helper de autenticação, reset de banco), `tests/global-setup.ts` (semeia o catálogo de permissões no banco de teste uma única vez por execução), `tests/unit` (services, schemas, middlewares — com repositórios mockados) e `tests/integration` (rotas reais via Supertest contra o Postgres de teste).

## Dados de demonstração (seed)

Todo usuário criado pela seed (incluindo os "convidados") já é `status=ACTIVE` com senha real — login funciona para todos.

| Papel | E-mail | Senha |
| --- | --- | --- |
| Administrador do Sistema | `admin@portus.dev` | `Admin@123456` |
| Fiscal SUAPE | `fiscal.suape@portus.dev` | `Demo@123456` |
| Fiscal Externo | `fiscal.externo@portus.dev` | `Demo@123456` |
| Fornecedor | `fornecedor@portus.dev` | `Demo@123456` |
| Auditoria | `auditoria@portus.dev` | `Demo@123456` |

A seed também cria 5 RDOs de demonstração (autorados pelo Fornecedor) em status variados — `DRAFT`, `UNDER_EXTERNAL_REVIEW`, `REJECTED_BY_EXTERNAL`, `UNDER_SUAPE_REVIEW`, `APPROVED` — cada um com atividade, equipe, equipamento, clima, ocorrência, não conformidade, evidência (com geolocalização) e histórico de status coerente com o caminho percorrido.

## Permissões

Sistema de permissões granulares por papel, com overrides por usuário. Catálogo (`Permission`) + defaults por papel (`RolePermission`) + diferenças individuais (`UserPermission`, grava só o que diverge do default — `granted: true` concede algo que o papel não dá, `granted: false` revoga algo que o papel dá). Fonte única de verdade: `prisma/permissions-catalog.ts` (consumido por `prisma/seed.ts` e por `tests/global-setup.ts`).

Chave no formato `feature:action`. Features: `users`, `organization`, `permissions`, `roles`, `dashboard`, `works`, `contracts`, `rdo`, `evidences`, `ai`, `reports`, `audit`, `integrations`, `fields`.

`GET /api/permissions` e `GET /api/roles/:role/permissions` são **públicos** (sem `authMiddleware`) — o wizard de Cadastro precisa deles antes de existir qualquer sessão, para já permitir customizar a permissão de cada usuário convidado. As demais rotas de permissão (`GET/PATCH /api/users/:id/permissions`) exigem `permissions:read`/`permissions:update`; autoedição é sempre bloqueada (403), mesmo para `SYSTEM_ADMIN`.

Middleware `requirePermission(key)` (`src/modules/permissions/require-permission.middleware.ts`): 401 sem sessão, 403 sem a chave no conjunto efetivo (`getEffectiveKeys` = defaults do papel ∪ overrides concedidos − overrides revogados).

## Endpoints

Prefixo: `/api`. Resposta de sucesso: `{ success: true, data, message }`. Resposta de erro: `{ success: false, message, errors? }`. Documentação interativa completa (todos os schemas/payloads/erros) em **`/api/docs`**.

### Auth / Organização / Usuários / Permissões

| Método | Rota | Auth | Descrição |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | — | Cadastra organização + Administrador do Sistema + usuários convidados (transacional, com senha real e permissões customizáveis por convidado) |
| `POST` | `/auth/login` | — | Autentica e retorna um JWT |
| `GET` | `/auth/me` | Bearer | Usuário autenticado + organização + permissões efetivas |
| `PATCH` | `/auth/me` | Bearer | Atualiza o próprio perfil (nome/e-mail/telefone/CPF/senha) |
| `GET` | `/organizations/me` | Bearer | Organização do usuário autenticado |
| `PATCH` | `/organizations/me` | Bearer (`organization:update`) | Atualiza a organização |
| `GET` | `/users` | Bearer (`users:read`) | Lista usuários da organização (paginação + filtros `role`/`status`/`q`) |
| `POST` | `/users` | Bearer (`users:create`) | Cria um novo usuário ativo, com senha e permissões customizáveis |
| `PATCH` | `/users/:id` | Bearer (`users:update`) | Atualiza um usuário da própria organização |
| `DELETE` | `/users/:id` | Bearer (`users:delete`) | Remove um usuário (bloqueia autoexclusão e remoção do último SYSTEM_ADMIN) |
| `GET` | `/permissions` | — | Catálogo completo de permissões |
| `GET` | `/roles/:role/permissions` | — | Permissões padrão de um papel |
| `GET` | `/users/:id/permissions` | Bearer (`permissions:read`) | Permissões efetivas de um usuário, com origem (`role`/`override`) |
| `PATCH` | `/users/:id/permissions` | Bearer (`permissions:update`) | Atualiza os overrides de permissão de um usuário (bloqueia autoedição) |

Perfis (`UserRole`): `SYSTEM_ADMIN`, `SUAPE_INSPECTOR`, `EXTERNAL_INSPECTOR`, `SUPPLIER`, `AUDITOR`.
Status (`UserStatus`): `ACTIVE`, `INVITED`, `INACTIVE`.

### RDO (Relatório Diário de Obra)

| Método | Rota | Auth | Descrição |
| --- | --- | --- | --- |
| `GET` | `/rdos` | `rdo:read` | Lista RDOs da organização (paginação + filtros `status`/`q`) |
| `POST` | `/rdos` | `rdo:create` | Cria um RDO em rascunho (Dados do Dia) |
| `GET` | `/rdos/:id` | `rdo:read` | Carrega o agregado completo do RDO |
| `PATCH` | `/rdos/:id` | `rdo:update` | Atualiza por seção — cada chave do body (`activities`, `teams`, `equipments`, `weather`, `occurrences`, `nonConformities`) substitui transacionalmente só aquela coleção; só funciona em status editável e para o autor (ou `rdo:manage_all`) |
| `DELETE` | `/rdos/:id` | `rdo:delete` | Soft-delete (`status=CANCELED`) — só a partir de `DRAFT`, nunca remove a linha |
| `POST` | `/rdos/:id/submit` | `rdo:submit` | Envia para revisão externa |
| `POST` | `/rdos/:id/external-review/approve` | `rdo:approve` | Aprova na revisão externa (avança para revisão SUAPE) |
| `POST` | `/rdos/:id/external-review/reject` | `rdo:reject` | Reprova na revisão externa (exige `comments`) |
| `POST` | `/rdos/:id/suape-review/approve` | `rdo:approve` | Aprovação final pela SUAPE |
| `POST` | `/rdos/:id/suape-review/reject` | `rdo:reject` | Reprova na revisão SUAPE (exige `comments`) |
| `POST` | `/rdos/:id/reopen` | `rdo:reopen` | Reabre um RDO aprovado/reprovado para correções |
| `POST` | `/rdos/:id/evidences` | `evidences:create` | Envia evidência (`multipart/form-data`: `file` + `type`/`caption`/geolocalização) |
| `GET` | `/rdos/:id/evidences` | `evidences:read` | Lista evidências do RDO |
| `PATCH` | `/rdos/:id/evidences/:evidenceId` | `evidences:update` (+ `evidences:validate_geo` se alterar `validationStatus`) | Atualiza legenda/validação de uma evidência |
| `DELETE` | `/rdos/:id/evidences/:evidenceId` | `evidences:delete` | Remove uma evidência (registro + arquivo em disco) |
| `GET` | `/rdos/:id/evidences/:evidenceId/file` | `rdo:read` | Download autenticado do arquivo (nunca exposto via diretório estático) |
| `POST` | `/rdos/:id/comments` | `rdo:comment` | Adiciona um comentário |
| `GET` | `/rdos/:id/comments` | `rdo:read` | Lista comentários |
| `GET` | `/rdos/:id/history` | `rdo:view_history` | Histórico de mudanças de status |

Status (`RdoStatus`): `DRAFT → SENT_TO_REVIEW → UNDER_EXTERNAL_REVIEW → EXTERNAL_APPROVED → UNDER_SUAPE_REVIEW → APPROVED`, com desvios para `REJECTED_BY_EXTERNAL`/`REJECTED_BY_SUAPE` (editáveis, podem ser reenviados) e `REOPENED` (após aprovado/reprovado). `SIGNATURE_PENDING`/`SIGNED` reservados para a assinatura eletrônica futura. `CANCELED` é o soft-delete. `submit()` e `external-review/approve` registram dois saltos de histórico na mesma chamada (`SENT_TO_REVIEW`→`UNDER_EXTERNAL_REVIEW`; `EXTERNAL_APPROVED`→`UNDER_SUAPE_REVIEW`) para caber nos 12 status sem rotas extras.

Evidências nunca ficam em diretório servido estaticamente — ficam em `UPLOADS_DIR` fora do alcance do Express, e o único jeito de baixá-las é a rota autenticada acima (organização + `rdo:read` verificados a cada download).

Obra/contrato (`workLabel`/`contractLabel`) são campos de texto livre no RDO — mock por enquanto, preparados para virar uma FK quando existir um módulo real de Obra/Contrato.

### IA (stub)

| Método | Rota | Auth | Descrição |
| --- | --- | --- | --- |
| `POST` | `/ai/rdo-text-suggestion` | `ai:generate_rdo_text` | Sugestão de texto para a descrição de uma atividade (texto canned, sem provedor externo) |
| `POST` | `/ai/audio-transcription` | `ai:transcribe_audio` | Transcrição de um áudio (`multipart/form-data`: `file`; texto canned, processado em memória, nunca persistido) |

Ambas têm um `// TODO: integrar com um provedor de IA real` no código — a estrutura (endpoint real, permissão, contrato de request/response) já está pronta para receber uma integração de verdade.

## Integração com o front (`portus`)

O payload de `POST /auth/register` espelha diretamente o wizard de Cadastro do front (`portus/src/types/cadastro.ts` — `CadastroFormState`/`UsuarioConvidado`): a etapa "Identificação" mapeia para `admin`, "Organização" para `organization`, e "Usuários" para `invitedUsers` (incluindo `permissionKeys` por convidado). A feature de RDO no front (`portus/src/components/rdos/`) consome a malha de endpoints `/rdos` e `/ai` acima ponta a ponta, incluindo upload de evidências e download autenticado.
