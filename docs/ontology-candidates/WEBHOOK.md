# Candidate feature: WEBHOOK

- Source repos:
  - **novu** (POST /webhooks, GET /webhooks, DELETE /webhooks/:webhookId — `webhook.controller.ts`)
  - **cal.com** (POST /webhooks, GET /webhooks, PATCH /:webhookId, DELETE /:webhookId — `webhooks.controller.ts`, `oauth-client-webhooks.controller.ts`, `event-types-webhooks.controller.ts`)
  - **directus** (POST /vercel/webhook — `partner-integrations.controller.ts`, POST /acs — SAML ACS webhook)
  - **medusa** (POST /admin/webhooks, GET /admin/hooks/* — `route.ts`)
- Rationale: Webhook registration and lifecycle management appears across 4 independent repos spanning notifications, scheduling, CMS, and e-commerce. Every SaaS platform needs outbound webhook delivery. Cross-repo value is clear.

## Proposed capabilities
- `WEBHOOK.CREATE`   aliases: `["webhook", "webhooks"]`             chain: BACKEND
- `WEBHOOK.LIST`     aliases: `[]`                                   chain: BACKEND
- `WEBHOOK.GET`      aliases: `[]`                                   chain: BACKEND
- `WEBHOOK.UPDATE`   aliases: `[]`                                   chain: BACKEND
- `WEBHOOK.DELETE`   aliases: `[]`                                   chain: BACKEND
- `WEBHOOK.TRIGGER`  aliases: `["trigger", "broadcast"]`            chain: BACKEND

## Proposed constraints (if any, with ontology-typed enums)
- `WEBHOOK_EVENT`  = ENUM[BOOKING_CREATED, BOOKING_CANCELLED, BOOKING_RESCHEDULED, FORM_SUBMITTED, ORDER_PLACED, PAYMENT_COMPLETED, MESSAGE_SENT, WORKFLOW_TRIGGERED]
- `DELIVERY_METHOD` = ENUM[HTTP_POST, HTTP_GET]

## Evidence
- Routes observed (novu): `POST /webhooks`, `GET /webhooks`, `DELETE /webhooks/:id`, `POST /verify-credentials`
- Routes observed (cal.com): `POST /webhooks`, `GET /:webhookId`, `PATCH /:webhookId`, `DELETE /:webhookId` (event-types-webhooks, oauth-client-webhooks)
- Routes observed (directus): `POST /vercel/webhook`, `POST /acs`
- Routes observed (medusa): `POST /admin/hooks/[id]` (via file-based router)
- Example call chains (novu): `WebhooksController` → `WebhookService` → repository → `RESPONSE`
