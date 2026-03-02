# Creating JWTs for the ice-cream app from another project

The ice-cream app does **not** expose a public API to create JWTs. Tokens are created by a **local script** in this repo. If you want to issue tokens from another app or machine (e.g. your auth dashboard), you have two options: run this repo’s script, or reimplement the same logic elsewhere using the same secret and payload format.

---

## Option A: Run the script from this repo

Use the script when you have (or can clone) the ice-cream-online-store repo and know the **same `JWT_SECRET`** the ice-cream app uses.

### 1. Where the script lives

- **Path:** `src/scripts/generate-token.ts`
- **Entry:** `npm run generate-token` (or `npx tsx src/scripts/generate-token.ts` from project root)

### 2. What you need

- **Node.js** and **npm** (or **pnpm** / **yarn**).
- **Dependencies:** From the ice-cream project root run `npm install` (the script uses `dotenv`, `jose`, and `tsx`).
- **Environment:** A `.env.local` in the ice-cream project root with at least:
  - `JWT_SECRET` – **Must match** the `JWT_SECRET` used by the ice-cream app (and its API) so the token verifies.
  - Optional: `NEXT_PUBLIC_SITE_URL` – Used for the “prod” link in the script output (e.g. `https://haim-ice-cream.com`).

You can run the script from another directory by pointing at the ice-cream repo and env:

```bash
cd /path/to/ice-cream-online-store
npm run generate-token
```

Or with a one-off env (no `.env.local` in repo):

```bash
cd /path/to/ice-cream-online-store
JWT_SECRET="your-shared-secret" npm run generate-token
```

### 3. Script options

| Input         | Default            | Description                                                       |
| ------------- | ------------------ | ----------------------------------------------------------------- |
| `role`        | `admin`            | `admin` or `driver`.                                              |
| `expiry`      | `14d`              | Lifetime: e.g. `14d`, `8h`, `30m`.                                |
| `path`        | `/management-menu` | Target path for generated links (e.g. where to land after login). |
| `--port=3000` | `3000`             | Local port for the “local” link.                                  |

**Examples:**

```bash
# Defaults: admin, 14d, /management-menu
npm run generate-token

# Positional: role, expiry, path
npm run generate-token -- driver 8h /orders

# Named
npm run generate-token -- --role=driver --expiry=8h --path=/orders --port=3000
```

### 4. What the script prints

- **Token** – The signed JWT (copy this).
- **Role, issued, expires.**
- **Quick links:**
  - **Local** – `http://localhost:<port><path>?token=<token>`
  - **Prod** – `<NEXT_PUBLIC_SITE_URL><path>?token=<token>` (if `NEXT_PUBLIC_SITE_URL` is set).
- **Cookie header** – e.g. `Cookie: token=<token>` (for API or debugging).
- **Browser console command** – A one-liner to set the cookie in the ice-cream app’s origin (e.g. paste in DevTools).

### 5. Using the token from another app

- **Redirect:** In your other app, redirect the user to the ice-cream app with the token in the query:
  - `https://your-ice-cream-domain.com<path>?token=<token>`
  - The ice-cream app will verify the token, set the `token` cookie, and redirect to `<path>` without `?token=`.
- **Cookie:** If the user is already on the ice-cream app, you can set the cookie via the script’s “Browser console command” (same origin), or your other app cannot set the ice-cream app’s cookie (cross-origin). So for cross-app flows, use the **redirect with `?token=`**.
- **API:** The ice-cream app’s API expects the JWT in the `Cookie` header as `token=...`. So any client that can send that cookie (e.g. same-origin browser, or a server that calls the API and forwards the cookie) can use the token.

---

## Option B: Create the JWT in your other app

If you don’t want to depend on the ice-cream repo, you can generate the JWT in your other app (or a script there) as long as you use the **same secret and payload format**.

### 1. Secret

- Use the **same value** as `JWT_SECRET` in the ice-cream app’s environment (e.g. copy from ice-cream’s `.env.local` / `.env.production` into your app’s config).

### 2. Payload and signing

- **Algorithm:** HS256.
- **Payload:** Include at least:
  - `role` – `"admin"` or `"driver"`.
  - `exp` – Expiry (Unix timestamp in **seconds**).
  - `iat` – Issued at (Unix timestamp in **seconds**).
  - For admin: `id: "admin"` (so the ice-cream app treats it as admin).
- **Sign** with `JWT_SECRET` (e.g. in Node with `jose`: `new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt(iat).setExpirationTime(exp).sign(secret)`).

### 3. Expiry format

- The ice-cream script parses strings like `14d`, `8h`, `30m` into an `exp` timestamp. If you do the same, users get the same behaviour (e.g. 14-day tokens).

### 4. Delivering the token to the ice-cream app

- Same as in Option A: redirect the user to  
  `https://<ice-cream-domain><path>?token=<token>`  
  so the ice-cream app can verify the token and set the cookie.

---

## Summary

| Goal                                | Approach                                                                                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Run the official script             | Use the ice-cream repo, set `JWT_SECRET` (and optionally `NEXT_PUBLIC_SITE_URL`), run `npm run generate-token` with the options you need. |
| Issue tokens from another app       | Either call the script (e.g. via `child_process`) or reimplement signing with the same `JWT_SECRET` and payload.                          |
| Log the user into the ice-cream app | Redirect to `https://<ice-cream-app><path>?token=<token>`; the app will verify the token and set the cookie.                              |

The script is **not** exposed as an API in the ice-cream app; it is for local or trusted use (e.g. your auth dashboard running the script or generating tokens with the same secret).
