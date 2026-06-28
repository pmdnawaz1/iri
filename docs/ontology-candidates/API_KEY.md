# Candidate feature: API_KEY / TOKEN

- Source repos:
  - **medusa** (POST /admin/api-keys, GET /admin/api-keys, DELETE /admin/api-keys/:id, POST /admin/api-keys/:id/revoke — `route.ts`)
  - **cal.com** (POST /api-keys, GET /api-keys, DELETE /:keyId, POST /refresh — `api-keys.controller.ts`)
  - **directus** (POST /auth, GET /random/string, POST /me/tfa/generate, POST /me/tfa/enable, POST /me/tfa/disable — `auth-controller`)
  - **novu** (GET /test/token/:userId — `auth.controller.ts`)
- Rationale: API key issuance, rotation, and revocation is a standard capability across developer-facing platforms. All 4 repos have explicit API key management surface.

## Proposed capabilities
- `API_KEY.CREATE`    aliases: `["api_key", "api-key", "apiKey", "api_keys"]`    chain: BACKEND
- `API_KEY.LIST`      aliases: `[]`                                               chain: BACKEND
- `API_KEY.REVOKE`    aliases: `["revoke"]`                                       chain: BACKEND
- `API_KEY.ROTATE`    aliases: `["refresh", "rotate"]`                            chain: BACKEND

## Proposed constraints (if any, with ontology-typed enums)
- `KEY_TYPE`   = ENUM[SECRET, PUBLISHABLE, PERSONAL, OAUTH_CLIENT]
- `MFA_METHOD` = ENUM[TOTP, SMS, EMAIL]

## Evidence
- Routes observed (medusa): `POST /admin/api-keys`, `GET /admin/api-keys`, `GET /admin/api-keys/:id`, `DELETE /admin/api-keys/:id`, `POST /admin/api-keys/:id/revoke`, `POST /admin/api-keys/:id/sales-channels` — file-based router
- Routes observed (cal.com): `POST /api-keys`, `GET /api-keys`, `DELETE /:keyId`, `POST /refresh` — `api-keys.controller.ts`
- Routes observed (directus): `POST /auth`, `GET /random/string`, `POST /me/tfa/generate`, `POST /me/tfa/enable` — auth router
- Routes observed (novu): `GET /test/token/:userId` — `auth.controller.ts`
- Example call chains (medusa): `POST /admin/api-keys` → `ApiKeyController` → `ApiKeyService` → DATABASE → `RESPONSE`
