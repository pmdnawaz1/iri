# IR Output — Directus (Headless CMS)

> Generated 2026-06-27 · Branch `code-ontology`  
> Source: [`https://github.com/directus/directus`](https://github.com/directus/directus)  
> Compiled subdir: `api/src`

---

## Graph Stats

| Metric | Value |
|---|---|
| **Artifacts** (files parsed) | 1145 |
| **Nodes** | 5846 |
| **Edges** | 12275 |
| **Capabilities bound** | 106 |
| **Mapped to ontology** | 8 |
| **Unmapped (ORPHAN)** | 98 |

---

## Node Kind Breakdown

| Kind | Count |
|---|---|
| `MODULE` | 2426 |
| `SQL_QUERY` | 800 |
| `VARIABLE` | 716 |
| `FUNCTION` | 672 |
| `METHOD` | 513 |
| `TYPE` | 178 |
| `INTERFACE` | 134 |
| `EVENT_CONSUMER` | 112 |
| `ROUTE` | 106 |
| `CLASS` | 89 |
| `SERVICE` | 45 |
| `EVENT` | 42 |
| `RESPONSE` | 9 |
| `CONTROLLER` | 4 |

---

## Routes Discovered (106)

- `DELETE /`
- `DELETE /:collection`
- `DELETE /:collection/:field`
- `DELETE /:collection/:pk`
- `DELETE /:id`
- `DELETE /:pk`
- `DELETE /:provider`
- `DELETE /addons/:id`
- `GET /`
- `GET /.well-known/oauth-authorization-server*`
- `GET /.well-known/oauth-protected-resource*`
- `GET /:collection`
- `GET /:collection/:field`
- `GET /:collection/:pk`
- `GET /:id`
- `GET /:pk`
- `GET /:pk/:filename?`
- `GET /:pk/compare`
- `GET /:provider`
- `GET /:provider/dashboard`
- `GET /:provider/projects`
- `GET /:provider/projects/:id`
- `GET /:provider/projects/:id/runs`
- `GET /:provider/projects/:id/runs/stats`
- `GET /:provider/runs/:id`
- `GET /addons`
- `GET /admin`
- `GET /callback`
- `GET /health`
- `GET /info`
- `GET /mcp-oauth/authorize`
- `GET /me`
- `GET /me/:collection/:pk?`
- `GET /me/globals`
- `GET /metadata`
- `GET /portal`
- `GET /random/string`
- `GET /register/verify-email`
- `GET /registry`
- `GET /robots.txt`
- `GET /server/ping`
- `GET /snapshot`
- `GET /sources/:chunk`
- `GET /specs/graphql/:scope?`
- `GET /specs/oas`
- `GET body`
- `GET default`
- `GET headers`
- `GET method`
- `PATCH /`
- `PATCH /:collection`
- `PATCH /:collection/:field`
- `PATCH /:collection/:pk`
- `PATCH /:id`
- `PATCH /:pk`
- `PATCH /:provider`
- `PATCH /:provider/projects`
- `PATCH /addons/:id`
- `PATCH /me`
- `PATCH /me/track/page`
- `POST /`
- `POST /:collection`
- `POST /:pk/promote`
- `POST /:pk/save`
- `POST /:pk/tfa/disable`
- `POST /:provider`
- `POST /:provider/projects/:id/deploy`
- `POST /:provider/runs/:id/cancel`
- `POST /acs`
- `POST /apply`
- `POST /auth`
- `POST /cache/clear`
- `POST /callback`
- `POST /chat`
- `POST /diff`
- `POST /export/:collection`
- `POST /files/`
- `POST /folder/:pk`
- `POST /import`
- `POST /import/:collection`
- `POST /invite`
- `POST /invite/accept`
- `POST /logout`
- `POST /mcp-oauth/authorize/decision`
- `POST /mcp-oauth/register`
- `POST /mcp-oauth/revoke`
- `POST /mcp-oauth/token`
- `POST /me/tfa/disable`
- `POST /me/tfa/enable/`
- `POST /me/tfa/generate/`
- `POST /object`
- `POST /owner`
- `POST /password/request`
- `POST /password/reset`
- `POST /pending-resolution`
- `POST /preview`
- `POST /refresh`
- `POST /register`
- `POST /registry/install`
- `POST /registry/reinstall`
- `POST /resolve`
- `POST /resolve-redirect`
- `POST /revert/:revision`
- `POST /setup`
- `POST /sort/:collection`
- `POST /translations/generate`

---

## Mapped Capabilities (8)

> These routes resolved to an existing ontology capability via the discovery cascade.

| Capability | Closure | Participating Nodes |
|---|---|---|
| `AUTH.LOGOUT` | ⚡ PARTIAL | 549 |
| `AUTH.REFRESH_TOKEN` | ⚡ PARTIAL | 549 |
| `PAYMENT.CANCEL` | ⚡ PARTIAL | 1 |
| `AUTH.REGISTER` | ⚡ PARTIAL | 1 |
| `PROFILE.VIEW` | ⚡ PARTIAL | 1 |
| `PROFILE.VIEW` | ⚡ PARTIAL | 1 |
| `PROFILE.VIEW` | ⚡ PARTIAL | 1 |
| `AUTH.REGISTER` | ⚡ PARTIAL | 1 |

---

## Unmapped / ORPHAN Routes (98)

> These routes resolved to **no** ontology id. They are the **candidate worklist** for ontology proposals.
> Cross-reference against `docs/ontology-candidates/` for proposed features.

| Unmapped Capability | Notes |
|---|---|
| `UNMAPPED.DELETE_ADDONS_ID` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.DELETE_COLLECTION` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.DELETE_COLLECTION_FIELD` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.DELETE_COLLECTION_PK` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.DELETE_ID` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.DELETE_PK` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.DELETE_PROVIDER` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.DELETE_ROOT` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_ADDONS` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_ADMIN` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_BODY` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_CALLBACK` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_COLLECTION` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_COLLECTION_FIELD` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_COLLECTION_PK` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_DEFAULT` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_HEADERS` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_HEALTH` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_ID` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_INFO` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_MCP_OAUTH_AUTHORIZE` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_METADATA` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_METHOD` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_ME_GLOBALS` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_PK` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_PK_COMPARE` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_PK_FILENAME` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_PORTAL` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_PROVIDER` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_PROVIDER_DASHBOARD` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_PROVIDER_PROJECTS` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_PROVIDER_PROJECTS_ID` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_PROVIDER_PROJECTS_ID_RUNS` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_PROVIDER_PROJECTS_ID_RUNS_STATS` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_PROVIDER_RUNS_ID` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_RANDOM_STRING` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_REGISTER_VERIFY_EMAIL` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_REGISTRY` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_ROBOTS_TXT` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_ROOT` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_SERVER_PING` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_SNAPSHOT` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_SOURCES_CHUNK` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_SPECS_GRAPHQL_SCOPE` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_SPECS_OAS` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_WELL_KNOWN_OAUTH_AUTHORIZATION_SERVER` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.GET_WELL_KNOWN_OAUTH_PROTECTED_RESOURCE` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.PATCH_ADDONS_ID` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.PATCH_COLLECTION` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.PATCH_COLLECTION_FIELD` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.PATCH_COLLECTION_PK` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.PATCH_ID` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.PATCH_ME_TRACK_PAGE` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.PATCH_PK` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.PATCH_PROVIDER` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.PATCH_PROVIDER_PROJECTS` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.PATCH_ROOT` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_ACS` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_APPLY` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_AUTH` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_CACHE_CLEAR` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_CALLBACK` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_CHAT` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_COLLECTION` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_DIFF` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_EXPORT_COLLECTION` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_FILES` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_FOLDER_PK` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_IMPORT` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_IMPORT_COLLECTION` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_INVITE` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_INVITE_ACCEPT` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_MCP_OAUTH_AUTHORIZE_DECISION` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_MCP_OAUTH_REVOKE` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_MCP_OAUTH_TOKEN` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_ME_TFA_DISABLE` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_ME_TFA_ENABLE` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_ME_TFA_GENERATE` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_OBJECT` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_OWNER` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_PASSWORD_REQUEST` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_PASSWORD_RESET` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_PENDING_RESOLUTION` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_PK_PROMOTE` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_PK_SAVE` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_PK_TFA_DISABLE` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_PREVIEW` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_PROVIDER` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_PROVIDER_PROJECTS_ID_DEPLOY` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_REGISTRY_INSTALL` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_REGISTRY_REINSTALL` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_RESOLVE` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_RESOLVE_REDIRECT` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_REVERT_REVISION` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_ROOT` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_SETUP` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_SORT_COLLECTION` | ontology gap — see proposal in candidates/ |
| `UNMAPPED.POST_TRANSLATIONS_GENERATE` | ontology gap — see proposal in candidates/ |

---

## Adapter Notes



> Standard Express/Fastify routing detected by `rir compile --json`.
