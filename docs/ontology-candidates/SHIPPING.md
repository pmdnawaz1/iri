# Candidate feature: SHIPPING / FULFILLMENT

- Source repos:
  - **medusa** (POST /admin/fulfillments, GET /admin/fulfillments, POST /admin/shipping-options, GET /admin/shipping-options, POST /admin/shipping-profiles, GET /admin/shipping-profiles, GET /admin/fulfillment-providers, GET /admin/fulfillment-sets — `route.ts`)
  - **medusa** (POST /admin/returns, GET /admin/returns, POST /admin/exchanges, POST /admin/claims — returns/exchanges/claims file-based routes)
  - **medusa** (GET /admin/stock-locations, POST /admin/stock-locations, GET /admin/inventory-items, POST /admin/reservations — inventory/stock routes)
- Rationale: Fulfillment, shipping options, and returns appear exclusively in medusa but represent a distinct, high-value domain. However they also appear in the **Vendure** e-commerce platform (another seed repo not yet compiled). These routes are NOT covered by the existing INVENTORY or ORDER features, which are more generic.

  > **Note**: This is a borderline case — only fully confirmed in medusa. Recommend compiling vendure before accepting this proposal to confirm cross-repo value. The medusa route set is rich enough to pre-propose.

## Proposed capabilities
- `SHIPPING.CREATE_OPTION`   aliases: `["shipping", "shipping-options", "shipping_options"]`  chain: BACKEND
- `SHIPPING.GET_RATES`       aliases: `["rates", "shipping-rates"]`                            chain: BACKEND
- `SHIPPING.FULFILL`         aliases: `["fulfill", "fulfillment", "fulfillments"]`             chain: BACKEND
- `SHIPPING.RETURN`          aliases: `["return", "returns"]`                                  chain: BACKEND
- `SHIPPING.EXCHANGE`        aliases: `["exchange", "exchanges"]`                              chain: BACKEND

## Proposed constraints (if any, with ontology-typed enums)
- `FULFILLMENT_STATUS` = ENUM[PENDING, SHIPPED, DELIVERED, CANCELLED, RETURNED]
- `CARRIER`            = ENUM[UPS, FEDEX, DHL, USPS, LOCAL]

## Evidence
- Routes observed (medusa): `POST /admin/fulfillments`, `GET /admin/fulfillments`, `GET /admin/fulfillment-providers`, `GET /admin/fulfillment-sets/:id/service-zones` — file-based router
- Routes observed (medusa): `POST /admin/shipping-options`, `GET /admin/shipping-options`, `POST /admin/shipping-profiles`, `GET /admin/shipping-profiles` — file-based router
- Routes observed (medusa): `POST /admin/returns`, `GET /admin/returns`, `POST /admin/exchanges`, `POST /admin/claims` — returns/exchanges file-based router
- Routes observed (medusa): `GET /admin/stock-locations`, `POST /admin/stock-locations`, `GET /admin/inventory-items` — inventory file-based router
- Example call chains: `POST /admin/fulfillments` → `FulfillmentController` → `FulfillmentWorkflow` → DATABASE → `RESPONSE`

> **Cross-repo note**: Recommend verifying against vendure (`packages/core/src`) before architect accept.
