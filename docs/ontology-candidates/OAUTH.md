# Candidate feature: OAUTH / INTEGRATION (Frontend DAG entry)

- Source repos:
  - **cal.com** (POST /oauth/authorize, POST /oauth/exchange, POST /oauth/refresh — `oauth-flow.controller.ts`; GET /oauth2/clients/:clientId, POST /oauth2/token — `oauth2.controller.ts`)
  - **directus** (GET /callback, POST /callback, GET /.well-known/oauth-protected-resource, GET /.well-known/oauth-authorization-server, GET /mcp-oauth/authorize, POST /mcp-oauth/token, POST /mcp-oauth/revoke — full OAuth 2.1 server)
  - **novu** (POST /vercel, PUT /vercel, GET /vercel/:configurationId, GET /vercel/:configurationId/projects, POST /vercel/webhook — `partner-integrations.controller.ts`)
  - **novu** (POST /integrations, GET /integrations, GET /integrations/webhook/provider/:id/status, PATCH /:integrationId, DELETE /:integrationId — `integrations.controller.ts`)
- Rationale: OAuth2 authorization code flow + third-party integration management appears in 3 independent repos. The existing AUTH feature covers user login but NOT the OAuth provider/integration management surface.

## Proposed capabilities
- `OAUTH.AUTHORIZE`          aliases: `["authorize", "oauth", "callback"]`         chain: BACKEND
- `OAUTH.EXCHANGE_TOKEN`     aliases: `["exchange", "token"]`                       chain: BACKEND
- `OAUTH.REFRESH`            aliases: `[]`                                           chain: BACKEND
- `INTEGRATION.CREATE`       aliases: `["integrations", "integration"]`             chain: BACKEND
- `INTEGRATION.LIST`         aliases: `[]`                                           chain: BACKEND
- `INTEGRATION.DELETE`       aliases: `[]`                                           chain: BACKEND

## Proposed constraints (if any, with ontology-typed enums)
- `GRANT_TYPE`   = ENUM[AUTHORIZATION_CODE, CLIENT_CREDENTIALS, REFRESH_TOKEN, PKCE]
- `OAUTH_SCOPE`  = ENUM[READ, WRITE, ADMIN, OPENID, PROFILE, EMAIL]

## Evidence
- Routes observed (cal.com): `POST /authorize`, `POST /exchange`, `POST /refresh` — `oauth-flow.controller.ts`
- Routes observed (cal.com): `GET /clients/:clientId`, `POST /token` — `oauth2.controller.ts`
- Routes observed (directus): `GET /.well-known/oauth-authorization-server*`, `GET /mcp-oauth/authorize`, `POST /mcp-oauth/token`, `POST /mcp-oauth/revoke` — full OAuth 2.1 server
- Routes observed (novu): `POST /integrations`, `GET /integrations`, `PATCH /:integrationId`, `DELETE /:integrationId` — `integrations.controller.ts`
- Routes observed (novu): `POST /vercel`, `GET /vercel/:configurationId/projects`, `POST /vercel/webhook` — `partner-integrations.controller.ts`
- Example call chains (cal.com): `OAuthController` → `OAuthService` → `TokenRepository` → DATABASE → `RESPONSE`
