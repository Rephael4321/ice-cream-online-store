# Temporary Privileged Token Lock

This document is now historical context.

The emergency single-token allowlist has been replaced by stateful privileged sessions backed by the `users` and `sessions` tables.

## Superseded by

- `db/migrations/001_stateful_privileged_sessions.sql`
- `docs/JWT-GENERATION.md`

## Notes

- privileged auth now uses revocable, session-backed management links
- raw `ADMIN_TOKEN` allowlisting is no longer the intended production model
- `?token=` CMS bootstrap links are supported again, but only for tokens that map to active DB sessions
