# Candidate feature: PRODUCT

- Source repos:
  - **medusa** (POST /admin/products, GET /admin/products, PATCH /admin/products/:id, DELETE /admin/products/:id, POST /admin/product-variants, GET /admin/product-variants, POST /admin/product-categories, GET /admin/product-categories, GET /admin/product-tags, GET /admin/product-types, GET /admin/collections — `route.ts`)
  - **directus** (GET /:collection, POST /:collection, PATCH /:collection/:pk, DELETE /:collection/:pk — generic CMS collection CRUD covering product-equivalent entities)
  - **twenty (CRM)**: company/person records as product-equivalent entities via `packages/twenty-server/src` (NestJS REST/GraphQL)
- Rationale: Product catalog CRUD with variants, categories, tags, and collections appears across medusa (e-commerce) and directus (headless CMS). This is a core commerce capability NOT covered by the current ontology CART/ORDER/INVENTORY features (those operate on products, not define them).

## Proposed capabilities
- `PRODUCT.CREATE`             aliases: `["product", "products"]`                           chain: BACKEND
- `PRODUCT.UPDATE`             aliases: `[]`                                                 chain: BACKEND
- `PRODUCT.DELETE`             aliases: `[]`                                                 chain: BACKEND
- `PRODUCT.LIST`               aliases: `[]`                                                 chain: BACKEND
- `PRODUCT.GET`                aliases: `[]`                                                 chain: BACKEND
- `PRODUCT.CREATE_VARIANT`     aliases: `["variant", "variants", "product-variants"]`       chain: BACKEND
- `PRODUCT.CREATE_CATEGORY`    aliases: `["category", "categories", "product-categories"]` chain: BACKEND

## Proposed constraints (if any, with ontology-typed enums)
- `PRODUCT_STATUS` = ENUM[DRAFT, PUBLISHED, REJECTED, PROPOSED]
- `VARIANT_TYPE`   = ENUM[SIZE, COLOR, MATERIAL, STYLE]

## Evidence
- Routes observed (medusa): `POST /admin/products`, `GET /admin/products`, `PATCH /admin/products/:id`, `DELETE /admin/products/:id` — file-based router
- Routes observed (medusa): `POST /admin/product-variants`, `GET /admin/product-variants/:id`, `POST /admin/product-categories`, `GET /admin/product-categories/:id/products` — file-based router
- Routes observed (medusa): `GET /admin/product-tags`, `GET /admin/product-types`, `GET /admin/collections`, `GET /admin/collections/:id/products` — file-based router
- Routes observed (directus): `GET /:collection`, `POST /:collection`, `PATCH /:collection/:pk`, `DELETE /:collection/:pk` — generic collection CRUD
- Example call chains: `POST /admin/products` → `ProductController` → `ProductWorkflow` → DATABASE → `RESPONSE`
