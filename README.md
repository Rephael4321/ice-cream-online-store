# Ice cream online store (המפנק)

Next.js app for an RTL Hebrew storefront (menu, cart, checkout) and a privileged **CMS** (products, categories, orders, clients, images, storage). Data lives in **PostgreSQL**; product media uses **S3** (`MEDIA_BUCKET`).

**Web Push (optional):** After migration `002_push_subscriptions.sql` and `VAPID_*` env vars, **admin**, **superuser**, and **driver** can enable browser notifications for **new orders** from **כלי ניהול** → **התראות דחיפה** (`/notifications`). See [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md#web-push-vapid).

## Requirements

- Node 20+ (matches typical Next 16 setups)
- PostgreSQL with schema from `db/migrations/` applied (see filenames for order: `001_…`, `002_…`, …)
- Environment variables: see [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md). Template: [`.env.example`](.env.example) (tracked in repo; copy to `.env.local`).

## Scripts

| Command | Purpose |
|--------|---------|
| `npm run dev` | Dev server (Turbopack, port 3000) |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Vitest (optional DB clone from dev — see [`docs/TEST-DB-SETUP.md`](docs/TEST-DB-SETUP.md)) |
| `npm run generate-token` | Mint a CMS bootstrap JWT for `admin`, `superuser`, or `driver` (default lifetime **`1mo`**, optional `--expiry=` / `--role=` / `--path=` — see [`docs/JWT-GENERATION.md`](docs/JWT-GENERATION.md); needs `JWT_SECRET`, `DATABASE_URL`, seeded users) |

## Documentation

| Doc | Contents |
|-----|----------|
| [`docs/JWT-GENERATION.md`](docs/JWT-GENERATION.md) | Stateful sessions, `?token=` bootstrap, logout |
| [`docs/API-AUTHORIZATION-AUDIT.md`](docs/API-AUTHORIZATION-AUDIT.md) | Every `/api/*` route and who may call it |
| [`docs/conventions/API-USAGE.md`](docs/conventions/API-USAGE.md) | Client `api` / `apiGet` / `apiPost` usage |
| [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md) | Environment variables used in code |
| [`docs/CMS-MIDDLEWARE.md`](docs/CMS-MIDDLEWARE.md) | `src/proxy.ts` edge gate, image rewrite, legacy `/management-menu` → `/` (query stripped) |

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
