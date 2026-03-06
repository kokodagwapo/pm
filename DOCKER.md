# Running PropertyPro with Docker

## Quick start

```bash
docker compose up -d
```

- **App:** http://localhost:3001 (or http://localhost:3000 if you change the port in `docker-compose.yml`)
- **MongoDB:** localhost:27017 (optional, for external tools)

## Super admin login (created on first start)

| Field    | Value                 |
|----------|-----------------------|
| **Email**    | `admin@propertypro.com` |
| **Password** | `Admin123$`            |

Demo accounts are seeded automatically when the app container starts (see `docker-entrypoint.sh`). Additional demo users:

- **Manager:** `manager@propertypro.com` / `Manager123$`
- **Tenant:** `tenant@propertypro.com` / `Tenant123$`

## Optional environment variables

Create a `.env` file (or set in the shell) to override:

- `NEXTAUTH_SECRET` – auth secret (defaults to a placeholder; set for production)
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` – for live Stripe payments

## Port conflict

If port 3000 is already in use, the compose file maps the app to **3001**. To use 3000, stop the other process and set in `docker-compose.yml`:

```yaml
ports:
  - "3000:3000"
environment:
  NEXTAUTH_URL: http://localhost:3000
```
