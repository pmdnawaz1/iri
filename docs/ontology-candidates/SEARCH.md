# Candidate feature: SEARCH

- Source repos:
  - **directus** (GET /specs/oas, GET /specs/graphql/:scope, GET /snapshot, GET /info — metadata/search endpoints; GET /sources/:chunk — content search)
  - **medusa** (GET /admin/products?q=, GET /admin/customers?q=, GET /admin/orders?q= — search-by-query-param pattern across all collection routes in file-based router)
  - **twenty (CRM)** (POST / — GraphQL root supports fulltext search via query)
  - **novu** (GET /requests, GET /requests/:requestId, GET /workflow-runs — activity log search)
- Rationale: Full-text / filtered search across entities appears in every repo. Medusa exposes it through query params; directus via collection GETs; novu via activity logs.

## Proposed capabilities
- `SEARCH.QUERY`         aliases: `["search", "q", "query", "find"]`      chain: BACKEND
- `SEARCH.SUGGEST`       aliases: `["suggest", "autocomplete"]`            chain: BACKEND
- `SEARCH.INDEX`         aliases: `["index", "reindex"]`                   chain: BACKEND

## Proposed constraints (if any, with ontology-typed enums)
- `SEARCH_ENGINE` = ENUM[ELASTICSEARCH, MEILISEARCH, ALGOLIA, POSTGRES_FTS, IN_MEMORY]

## Evidence
- Routes observed (directus): `GET /sources/:chunk`, `GET /specs/oas`, `GET /specs/graphql/:scope?` — content discovery
- Routes observed (medusa): all `GET /admin/:entity` routes accept `?q=` filter — 40+ collection search endpoints
- Routes observed (novu): `GET /requests`, `GET /requests/:requestId`, `GET /workflow-runs`, `GET /workflow-runs/:workflowRunId` — `activity.controller.ts`
- Routes observed (twenty): `POST /` (GraphQL) with `search` field resolver — `packages/twenty-server/src`
- Example call chains (medusa): `GET /admin/products?q=shirt` → `ProductController` → `ProductService` → `ProductRepository` → DATABASE → `RESPONSE`
