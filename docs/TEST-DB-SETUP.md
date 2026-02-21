# Test database setup

Tests use the **test DB** defined in `.env.test` (e.g. `localhost:15432`, user `testuser`, database `test_db`). You need a Postgres server running that matches those settings. The test run then **initializes** the DB by cloning from your Docker dev DB.

## 1. Start the test Postgres server

You only need a running Postgres instance that accepts the credentials in `.env.test`. Two options:

### Option A: Docker (recommended)

Run a Postgres container that matches `.env.test`:

```bash
docker run -d --name ice-cream-test-db \
  -e POSTGRES_USER=testuser \
  -e POSTGRES_PASSWORD=testpassword \
  -e POSTGRES_DB=postgres \
  -p 15432:5432 \
  postgres:16
```

- The **database** `test_db` does not need to exist yet; the test globalSetup will create it when you run tests.
- Use `postgres` as the initial DB so the `testuser` can connect and run `CREATE DATABASE test_db`.

### Option B: Local Postgres

If you have Postgres installed locally:

1. Create a role (if needed):
   ```sql
   CREATE USER testuser WITH PASSWORD 'testpassword' CREATEDB;
   ```
2. Either create the database `test_db` yourself, or leave it out and let the test setup create it (the setup connects to the `postgres` DB and runs `CREATE DATABASE test_db` if missing).

Make sure the server listens on the port in `.env.test` (e.g. `15432`). You may need a separate cluster or a custom `postgresql.conf` / port mapping.

## 2. “Init” the test DB (what actually happens)

You don’t run a separate “init” script. When you run tests:

1. **globalSetup** runs once:
   - Connects to the test Postgres server (using `.env.test`).
   - Connects to the default `postgres` DB and creates the database **test_db** if it doesn’t exist.
   - Runs **pg_dump** on the **dev DB** (from `.env.local`, e.g. your Docker dev Postgres).
   - Runs **pg_restore** into **test_db** with `--clean` and `--no-owner`, so the test DB gets the same schema and data as dev (objects are owned by the test user).

2. **Tests** run using `.env.test`, so all DB access goes to this freshly cloned test DB.

If your dev DB is **Neon** (or another cloud Postgres), the dump may include Neon-specific options (e.g. `transaction_timeout`). Restore can report one non-fatal error; globalSetup still treats the clone as successful if the expected tables exist.

So “init” = start the test Postgres server (step 1 above), then run:

```bash
npm test
```

The first time (and every time), globalSetup ensures `test_db` exists and then overwrites it with a full copy of the dev DB.

## 3. Optional: skip the clone

If the test Postgres or dev DB isn’t running, you can still run tests without cloning (e.g. for unit tests that don’t need the DB):

```bash
SKIP_DB_CLONE=1 npm test
```

On Windows PowerShell:

```powershell
$env:SKIP_DB_CLONE="1"; npm test
```

Then the test DB is not created or updated; any test that needs the DB may fail if nothing is there.

## 4. Requirements for the full flow

- **pg_dump** and **pg_restore** on your `PATH` (e.g. from a Postgres client install).
- **Dev DB** (from `.env.local`) reachable when running tests (e.g. Docker dev Postgres with port mapped to host).
- **Test Postgres** (from `.env.test`) running and accepting connections (e.g. Docker container on port 15432 as above).

Order and role tests expect the cloned DB to contain at least one product (e.g. id 64). Pricing tests may insert/delete rows in `sales`; sale-group tests rely on dev data if present.
