# Environment variables

Values are read from `.env.local` (and platform env in production). This list matches **current** usage in `src/` and scripts; optional entries are noted.

## Core

| Variable | Required for | Notes |
|----------|----------------|-------|
| `DATABASE_URL` | App, `npm run generate-token` | Postgres connection string |
| `JWT_SECRET` | JWT sign/verify, token script | Same secret everywhere that should accept the same tokens |

## Privileged auth cookie

The HTTP-only cookie name is fixed in code as **`token`** (`AUTH_COOKIE_NAME` in `src/lib/auth/session.ts`). No env override.

When CMS access is bootstrapped via `?token=...`, edge middleware (`src/proxy.ts`) sets this cookie with **`maxAge`** derived from the JWT **`exp`** claim so the browser keeps the cookie as long as the token is valid. If `exp` cannot be decoded, **`SESSION_MAX_AGE_SECONDS`** (8 hours, same file) is used. See [`JWT-GENERATION.md`](./JWT-GENERATION.md) and [`CMS-MIDDLEWARE.md`](./CMS-MIDDLEWARE.md).

## Store / URLs (public)

| Variable | Used for |
|----------|-----------|
| `NEXT_PUBLIC_SITE_URL` | Absolute URLs, cart/WhatsApp links, search page fetch |
| `NEXT_PUBLIC_PHONE` | Business phone in cart / modals |
| `NEXT_PUBLIC_DELIVERY_THRESHOLD` | Free-delivery threshold (default `90`) |
| `NEXT_PUBLIC_DELIVERY_FEE` | Delivery fee (default `10`) |
| `NEXT_PUBLIC_MEDIA_BUCKET` | CMS image picker (public bucket name hint) |
| `NEXT_PUBLIC_CART_DEBUG` | Optional cart debug flag |

## AWS / media

| Variable | Used for |
|----------|-----------|
| `MEDIA_BUCKET` | S3 bucket for uploads and listings |
| `AWS_REGION` | S3 region (default `us-east-1` in some paths) |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | SDK credentials (e.g. assume-role flow) |
| `CLIENT_ROLE_ARN` / `ASSUME_ROLE_EXTERNAL_ID` | `src/lib/aws/assume-role.ts` |
| `CDN_BASE` | Optional override for public object base URL |
| `S3_PUBLIC_HOST` | Used in `unused-images` route |

## Security / proxy

| Variable | Used for |
|----------|-----------|
| `ALLOWED_IMAGE_HOSTS` | Comma-separated hostnames allowed for `/api/img-proxy` and `_next/image` rewrite in `src/proxy.ts` |

## Google Places (server-only)

| Variable | Used for |
|----------|-----------|
| `GOOGLE_MAPS_API_KEY` | `/api/places/autocomplete`, `/api/places/details` |

## Web Push (VAPID)

| Variable | Used for |
|----------|-----------|
| `VAPID_PUBLIC_KEY` | Exposed via `GET /api/push/vapid-public-key` and used when subscribing in the browser |
| `VAPID_PRIVATE_KEY` | Server-only: signs outbound push requests (`web-push` package) |
| `VAPID_SUBJECT` | Contact URI for push providers: **`mailto:...`** or **`https://...`** (spec requirement) |

**If any of the three is missing**, the app logs once and **skips sending** pushes; checkout and the rest of the app still work.

**Keys:** `npx web-push generate-vapid-keys` → copy into `.env.local`. For local development, **`mailto:your@email`** is recommended for `VAPID_SUBJECT` (avoid `https://localhost` as subject: Apple’s push service may reject it; `web-push` warns in that case).

**Database:** apply `db/migrations/002_push_subscriptions.sql` (table `push_subscriptions`: `user_id` → `users`, unique `endpoint`, keys `p256dh` / `auth`).

**Where it runs in code**

| Area | Location |
|------|----------|
| Subscribe / test APIs | `src/app/api/push/` |
| Send + VAPID init | `src/lib/push/` |
| After new order | `notifyNewOrder` from `src/app/api/orders/route.ts` (after `COMMIT`, non-blocking) |
| Service worker | `public/sw.js` (`push`, `notificationclick` → `/orders` or order URL) |
| CMS UI | `/notifications` — **כלי ניהול** (`/cms`) tile **התראות דחיפה**; layout uses `SectionScaffold` with section `notifications` in `src/components/cms/sections/config.ts` |

**PWA note:** iOS Web Push generally requires the site added to the Home Screen; desktop Chromium often works in a normal tab over HTTPS (or localhost).

## Optional / tooling

| Variable | Used for |
|----------|-----------|
| `VERCEL_URL` | Fallback site URL in `src/lib/site-url.ts` when deployed |
| `SITE_URL` | Some migration / image tooling |
| `TELEGRAM_BOT_TOKEN_DEPRECATIONS` / `TELEGRAM_CHAT_ID_DEPRECATIONS` | Deprecation notifications |
| `IMAGE_MIGRATION_JSON_BUCKET` / `IMAGE_MIGRATION_JSON_KEY` / `IMAGE_MIGRATION_JSON_PATH` | `src/lib/image-migration.ts` |

## Tests

Vitest uses `.env.test` for the **test** database (see [`TEST-DB-SETUP.md`](./TEST-DB-SETUP.md)). That file is separate from `.env.local`.
