# MotoSport Manager backend

Independent NestJS API application. It runs separately from the Vite frontend.

## Setup

Run commands from the `backend/` directory. Nest `ConfigModule.forRoot()`
loads `.env` from the process working directory by default. Variables already
present in the Codespaces environment take precedence over values in `.env`.

```bash
cd /workspaces/motosport-manager/backend
npm install
cp .env.example .env
```

Edit `.env` locally if needed. Do not commit it or paste secrets into commands,
chat, or logs. `backend/.gitignore` excludes `.env`. Keep the checked-in
`DATABASE_ENABLED=false` default until you intentionally test the database.

The supplied CA file is `backend/cert/ca.pem`. When running from `backend/`,
its correct `PGSSL_CA_FILE` value is `cert/ca.pem`. For a local connection test,
ensure the Codespaces environment has the six `PG*` connection variables set
to the runtime account, then run:

```bash
DATABASE_ENABLED=true \
PGSSLMODE=verify-full \
PGSSL_CA_FILE=cert/ca.pem \
npm run start:dev
```

The inline settings override same-named `.env` or Codespaces values for this
process only; no password is placed on the command line. After startup, test
database readiness in another terminal:

```bash
curl --fail http://localhost:3000/api/health/ready
```

`GET /api/health` is liveness; use `GET /api/health/ready` to verify the
database connection.

## Environment

`DATABASE_ENABLED` defaults to `false`, allowing local API development without
opening a database connection. Set it to `true` only when a dedicated runtime
database account is available, then configure `PGHOST`, `PGPORT`, `PGDATABASE`,
`PGUSER`, `PGPASSWORD`, and `PGSSLMODE`. Production must not use `avnadmin`.

`PGSSLMODE` supports `disable`, `require`, `verify-ca`, and `verify-full`.
Production database connections require `PGSSLMODE=verify-full` and
`PGSSL_CA_FILE` pointing to a readable PEM CA certificate file. The CA must be
provided through a secure local/Render secret file and must not be committed.
When running from the `backend/` directory, the supplied Codespaces certificate
can be referenced as `cert/ca.pem`; set the path to the secret file location
configured in Render for deployment.
With a CA configured, node-postgres verifies the certificate chain; `verify-full`
also verifies the server hostname. `require` without a CA encrypts traffic but
does not verify the server certificate.

`DB_RETRY_ATTEMPTS` defaults to 5 (allowed: 1-10), and
`DB_RETRY_DELAY_MS` defaults to 2000 (allowed: 100-10000).
`CORS_ORIGINS` is a comma-separated list of exact origins; production requires
one or more HTTPS origins and wildcard origins are rejected.

TypeORM is configured with `synchronize: false`. This backend does not import
`database/schema.sql`, create entities, or alter the database schema.

`GET /api/health` is a liveness check. `GET /api/health/ready` runs `SELECT 1`
when the database is enabled, and returns HTTP 503 with `database: "disabled"`
when it is not enabled. Readiness responses do not include connection details.

## Checks

```bash
npm run build
npm test
npm run test:e2e
```
