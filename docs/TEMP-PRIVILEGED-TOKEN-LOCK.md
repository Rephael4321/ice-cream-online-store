# Temporary Privileged Token Lock

This repository currently hard-blocks privileged JWT access.

## What is blocked

- Any JWT payload that identifies as `admin`
- Any JWT payload that identifies as `driver`
- Legacy admin payload shapes such as `admin: true` or `id: "admin"`

## Current behavior

- `verifyJWT()` returns `null` for privileged tokens
- `createJWT()` rejects privileged token issuance
- `createJWTWithExpiry()` rejects privileged token issuance
- CMS page routes redirect as if no valid token was sent
- Protected API routes return `401` as if no valid token was sent
- Token cookies are cleared when protected CMS routes reject access

## Why this exists

This is an emergency temporary lock intended to disable privileged access after token exposure.

## Before removing

- Rotate `JWT_SECRET`
- Re-issue any legitimate admin or driver tokens
- Re-test CMS pages and protected API routes
