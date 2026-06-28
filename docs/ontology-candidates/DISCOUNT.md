# Candidate feature: DISCOUNT / PROMOTION

- Source repos:
  - **medusa** (POST /admin/promotions, GET /admin/promotions, PATCH /admin/promotions/:id, DELETE /admin/promotions/:id — promotions file-based router; POST /admin/campaigns, GET /admin/campaigns, PATCH /admin/campaigns/:id — campaigns file-based router; POST /admin/price-lists, GET /admin/price-lists, DELETE /admin/price-lists/:id — price lists file-based router)
  - **medusa** (GET /admin/discount-codes ← store routes; POST /store/promotions/apply — store promo routes)
- Rationale: Promotions, campaigns, and discount code management appear extensively in medusa. This is a standard commerce capability missing from the current ontology. Vendure (another seed repo) also has promotion management — recommend validating before accept.

  > **Cross-repo note**: Strongly recommend compiling vendure (`packages/core/src`) before architect accept to confirm 2-repo minimum.

## Proposed capabilities
- `DISCOUNT.CREATE`          aliases: `["discount", "promotion", "promotions", "promo"]`   chain: BACKEND
- `DISCOUNT.UPDATE`          aliases: `[]`                                                  chain: BACKEND
- `DISCOUNT.DELETE`          aliases: `[]`                                                  chain: BACKEND
- `DISCOUNT.LIST`            aliases: `[]`                                                  chain: BACKEND
- `DISCOUNT.APPLY`           aliases: `["apply", "redeem"]`                                chain: BACKEND
- `DISCOUNT.CREATE_CAMPAIGN` aliases: `["campaign", "campaigns"]`                          chain: BACKEND

## Proposed constraints (if any, with ontology-typed enums)
- `DISCOUNT_TYPE`   = ENUM[PERCENTAGE, FIXED_AMOUNT, FREE_SHIPPING, BUY_X_GET_Y]
- `DISCOUNT_SCOPE`  = ENUM[ORDER, LINE_ITEM, SHIPPING]
- `CAMPAIGN_STATUS` = ENUM[DRAFT, ACTIVE, SCHEDULED, ENDED]

## Evidence
- Routes observed (medusa): `POST /admin/promotions`, `GET /admin/promotions`, `GET /admin/promotions/:id`, `PATCH /admin/promotions/:id`, `DELETE /admin/promotions/:id` — file-based router
- Routes observed (medusa): `POST /admin/campaigns`, `GET /admin/campaigns`, `GET /admin/campaigns/:id/promotions`, `PATCH /admin/campaigns/:id` — file-based router
- Routes observed (medusa): `POST /admin/price-lists`, `GET /admin/price-lists`, `DELETE /admin/price-lists/:id`, `GET /admin/price-lists/:id/prices` — file-based router
- Routes observed (medusa): `GET /admin/price-preferences`, `POST /admin/price-preferences` — file-based router
- Example call chains: `POST /admin/promotions` → `PromotionController` → `PromotionWorkflow` → DATABASE → `RESPONSE`
