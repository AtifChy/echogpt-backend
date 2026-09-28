# EchoGPT Backend

[![NestJS](https://img.shields.io/badge/NestJS-12-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-8-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Bun](https://img.shields.io/badge/Bun-1.4-F9F1E1?logo=bun&logoColor=black)](https://bun.sh/)
[![Vitest](https://img.shields.io/badge/Vitest-5-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3-6BA539?logo=openapiinitiative&logoColor=white)](https://www.openapis.org/)

REST API for the EchoGPT Chrome extension. It provides authentication, user accounts, subscriptions, AI provider management, chat history, Brave-powered web search, admin tools, and Swagger documentation.

## Technology

- NestJS 12
- TypeScript 6
- PostgreSQL 17
- Prisma ORM 8 contract-first API
- Passport JWT authentication
- Swagger / OpenAPI
- Bun
- Vitest
- Docker Compose for the local database

## Features

- Registration, login, refresh-token rotation, and secure logout
- Password hashing with Argon2 and database-backed sessions
- User profiles, password changes, and account deletion
- `USER` and `ADMIN` role authorization
- Free and Premium subscriptions with request limits
- OpenAI, Anthropic, and Google Gemini providers
- AES-256-GCM encryption for stored provider API keys
- Conversations, messages, AI responses, and optional web citations
- Brave LLM Context search, history, recent searches, and suggestions
- Admin dashboard, user status, subscriptions, usage logs, and health checks
- Request validation, rate limiting, CORS, Helmet, and documented errors
- Unit and end-to-end tests

## Requirements

Install the following before starting:

- [Bun](https://bun.sh/) 1.4 or newer
- Node.js 22.18.x or 24.11 or newer
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Git

The Docker Compose file runs PostgreSQL only. The NestJS application runs directly on your computer with Bun.

## First-time setup

### 1. Install dependencies

```bash
bun install
```

### 2. Create the environment file

On PowerShell:

```powershell
Copy-Item .env.example .env
```

On macOS or Linux:

```bash
cp .env.example .env
```

Open `.env` and replace the example secrets. Generate a different random value for each secret with:

```bash
bun -e "import { randomBytes } from 'node:crypto'; console.log(randomBytes(32).toString('base64'))"
```

Use one generated value for `JWT_ACCESS_SECRET` and another for `PROVIDER_ENCRYPTION_KEY_BASE64`. The provider encryption key must remain the same after provider records have been created; changing it makes existing encrypted API keys unreadable.

Add a valid Brave Search API key to `BRAVE_SEARCH_API_KEY`. Provider API keys for OpenAI, Anthropic, and Gemini are added later through the protected admin API and are not stored in `.env`.

Important environment variables:

| Variable                         | Purpose                                                                 |
| -------------------------------- | ----------------------------------------------------------------------- |
| `DATABASE_URL`                   | PostgreSQL connection used by the app and Prisma CLI                    |
| `PORT`                           | HTTP port; defaults to `3000`                                           |
| `JWT_ACCESS_SECRET`              | Signs access tokens; must contain at least 32 characters                |
| `JWT_ACCESS_TTL`                 | Access-token lifetime, such as `15m`                                    |
| `REFRESH_TOKEN_TTL_DAYS`         | Refresh-session lifetime in days                                        |
| `CORS_ORIGINS`                   | Comma-separated allowed web or Chrome-extension origins                 |
| `PROVIDER_ENCRYPTION_KEY_BASE64` | Base64-encoded 32-byte key used to encrypt provider API keys            |
| `BRAVE_SEARCH_API_KEY`           | Brave Search API subscription key                                       |
| `SEARCH_CACHE_MINUTES`           | Reserved cache TTL setting; result caching is not currently implemented |

For the Chrome extension, replace the example extension origin in `CORS_ORIGINS` with its real extension ID.

### 3. Start PostgreSQL

Make sure Docker Desktop is running, then run:

```bash
bun run db:up
```

This starts the `echogpt-postgres` container and waits until PostgreSQL is healthy.

### 4. Initialize the database

For a new local database:

```bash
bun run db:init
```

This applies the current Prisma contract. The application seeds the `USER` and `ADMIN` roles when it starts.

### 5. Start the API

```bash
bun run dev
```

The development server watches the source files and restarts when they change.

Open:

- API: [http://localhost:3000/api/v1](http://localhost:3000/api/v1)
- Public health check: [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)
- Swagger UI: [http://localhost:3000/docs](http://localhost:3000/docs)
- OpenAPI JSON: [http://localhost:3000/docs-json](http://localhost:3000/docs-json)

## Normal development workflow

After the first setup, only these commands are normally needed:

```bash
bun run db:up
bun run dev
```

Stop PostgreSQL without deleting its data:

```bash
bun run db:down
```

Do not add `-v` unless you intentionally want to delete the PostgreSQL volume and all local data.

## Create the first admin

Public registration always creates a normal `USER`. To create an admin safely:

1. Register through `POST /api/v1/auth/register` in Swagger.
2. Promote that account from the project directory:

```bash
bun run admin:promote user@example.com
```

The command updates the existing account to the seeded `ADMIN` role. Admin endpoints can then be called with that user's bearer access token.

## Configure an AI provider

Use an admin token in Swagger:

1. Open `/docs` and select **Authorize**.
2. Enter the access token returned by login or registration.
3. Call `POST /api/v1/admin/providers` with an OpenAI, Anthropic, or Gemini API key.
4. Enable the provider with `PATCH /api/v1/admin/providers/{id}/enabled`.
5. Make it the default with `PUT /api/v1/admin/providers/{id}/default`.
6. Check connectivity with `POST /api/v1/admin/providers/{id}/health`.

Provider API keys are encrypted before being stored and are never returned by the API.

## Main API areas

All routes use the `/api/v1` prefix.

| Area                   | Routes                                                                                             | Access               |
| ---------------------- | -------------------------------------------------------------------------------------------------- | -------------------- |
| Authentication         | `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`                                   | Public except logout |
| Profile                | `/users/me`                                                                                        | Authenticated user   |
| Subscription and usage | `/subscriptions/me`, `/usage/me`                                                                   | Authenticated user   |
| Conversations and chat | `/conversations`, `/chat/messages`                                                                 | Authenticated user   |
| Web search             | `/search`, `/search/history`, `/search/recent`, `/search/suggestions`                              | Authenticated user   |
| Provider management    | `/admin/providers`                                                                                 | Admin only           |
| Administration         | `/admin/dashboard`, `/admin/users`, `/admin/subscriptions`, `/admin/request-logs`, `/admin/health` | Admin only           |

Swagger contains the complete request bodies, parameters, response examples, authentication requirements, and error responses for every endpoint.

## Postman collection

To open the collection:

1. Start the API with `bun run dev`.
2. Open the repository root in the Postman desktop app using **Files → Open folder**.
3. Switch Postman to **Local View**.
4. Select the **EchoGPT Local** environment.
5. Open the **EchoGPT Backend API** collection.
6. Start with **Authentication → Register user** or **Login**.

Successful authentication automatically saves the access token, refresh token, and user ID. Creating a provider or conversation also saves its ID for later requests.

Before using the admin folders, promote the registered account with `bun run admin:promote <email>`. Then configure `providerType`, `providerModel`, and `providerApiKey` in the collection variables. Add, enable, and select a default provider before using Chat. Supported provider types are `OPENAI`, `ANTHROPIC`, and `GEMINI`.

Logout, password change, account deletion, conversation deletion, provider deletion, and history clearing change or remove stored state, so run them only when needed. Their Postman scripts clear revoked tokens and deleted resource IDs automatically.

## Tests

Unit tests use test environment values. End-to-end tests also require a separate PostgreSQL database so development data is never cleared.

### First-time test database setup

Copy the test environment file:

```powershell
Copy-Item .env.test.example .env.test
```

On macOS or Linux, use `cp .env.test.example .env.test`.

Create the database inside the running PostgreSQL container:

```bash
docker compose exec -T postgres createdb -U echogpt echogpt_test
```

If PostgreSQL reports that `echogpt_test` already exists, keep it and continue. Initialize its schema:

```bash
bun run db:test:init
```

### Run checks

```bash
# Unit tests
bun run test

# End-to-end API tests
bun run test:e2e

# Unit and end-to-end tests
bun run test:all

# Test TypeScript files
bun run test:typecheck

# Coverage report
bun run test:coverage

# Formatting check
bun run fmt:check

# Production build
bun run build
```

The test guard refuses to run when `DATABASE_URL` does not point to `echogpt_test`.

## Database changes with Prisma 8

This repository uses Prisma 8's contract-first workflow. The editable schema is:

```text
src/prisma/contract.prisma
```

Do not add the older `schema.prisma`, generated `PrismaClient`, or `prisma migrate dev` workflow.

After changing the contract:

```bash
# Generate contract.json and contract.d.ts
bun run contract:emit

# Plan a migration from the current database reference
bun run migration:plan -- --name describe-the-change

# Apply committed migrations
bun run migrate

# Verify the database against the contract
bun run db:verify
```

Commit the contract, generated contract files, and migration files together. Do not edit generated contract or migration JSON files by hand.

For a fresh empty database, use `bun run db:init` instead of replaying development setup manually.

## Build and run

```bash
bun run build
bun run start
```

The compiled application is written to `dist/server.mjs`.

## Project structure

```text
src/
├── admin/           Admin dashboard and management APIs
├── auth/            Passport JWT authentication and sessions
├── chat/            Conversations, prompts, and AI responses
├── common/          Shared decorators, guards, and Swagger errors
├── config/          Environment validation
├── health/          Public health endpoint
├── prisma/          Prisma 8 contract, database connection, and seed
├── providers/       OpenAI, Anthropic, and Gemini adapters
├── search/          Brave LLM Context search
├── subscriptions/   Plans, usage limits, and admin updates
├── users/           Profile, password, and account operations
├── prisma.module.ts
├── prisma.service.ts
├── app.module.ts
└── main.ts

test/
├── unit/            Service and security tests
└── e2e/             Full HTTP API tests
```

## Security notes

- Never commit `.env`, `.env.test`, API keys, tokens, or production credentials.
- Use new random secrets in every deployed environment.
- Keep `PROVIDER_ENCRYPTION_KEY_BASE64` stable and store it in a secret manager in production.
- Use HTTPS in production.
- Restrict `CORS_ORIGINS` to the real frontend and Chrome-extension origins.
- Public registration cannot assign the `ADMIN` role; use the promotion script from a trusted environment.
- Password changes, logout, suspension, and refresh-token rotation revoke the relevant database sessions.

## Troubleshooting

### Docker cannot bind port 5432

Another PostgreSQL instance is already using the port. Stop that instance or change the host port in `docker-compose.yml` and update `DATABASE_URL` to match.

### Protected endpoints return `Session is no longer active`

The access token belongs to a revoked, expired, or deleted session. Log in again and replace the token in Swagger's **Authorize** dialog.

### Brave search returns 502

Check that `BRAVE_SEARCH_API_KEY` is valid and that the request values are supported by Brave LLM Context. The API translates an upstream Brave failure into a `502 Bad Gateway` response.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
