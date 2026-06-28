# Candidate feature: SUBSCRIPTION

- Source repos:
  - **novu** (POST /subscriptions, GET /subscriptions, PATCH /subscriptions/:subscriptionIdentifier, GET /topics/:topicKey/subscriptions, POST /topics/:topicKey/subscriptions — `inbox.controller.ts`, `inbox.topic.controller.ts`)
  - **cal.com** (POST /reservations, GET /reservations/:uid, PATCH /reservations/:uid, DELETE /reservations/:uid, DELETE /selected-slot — `slots.controller.ts`)
  - **medusa** (POST /admin/subscriptions, GET /admin/subscriptions — `route.ts`)
  - **directus** (POST /subscriptions — dynamic collection route via `/:collection`)
- Rationale: Subscription/notification-opt-in patterns appear in notifications (novu), scheduling slot reservation (cal.com), and e-commerce (medusa). The concept of a persistent user-to-entity subscription is cross-domain.

## Proposed capabilities
- `SUBSCRIPTION.CREATE`    aliases: `["subscribe", "subscriptions"]`       chain: BACKEND
- `SUBSCRIPTION.CANCEL`    aliases: `["unsubscribe"]`                       chain: BACKEND
- `SUBSCRIPTION.UPDATE`    aliases: `[]`                                    chain: BACKEND
- `SUBSCRIPTION.LIST`      aliases: `[]`                                    chain: BACKEND
- `SUBSCRIPTION.GET`       aliases: `[]`                                    chain: BACKEND

## Proposed constraints (if any, with ontology-typed enums)
- `SUBSCRIPTION_STATUS` = ENUM[ACTIVE, PAUSED, CANCELLED, EXPIRED]
- `BILLING_INTERVAL`    = ENUM[MONTH, YEAR, WEEK, DAY]

## Evidence
- Routes observed (novu): `POST /subscriptions`, `GET /subscriptions/:subscriberId`, `PATCH /subscriptions/:subscriptionIdentifier/preferences/:workflowIdOrIdentifier` — `inbox.controller.ts`
- Routes observed (novu): `POST /topics/:topicKey/subscriptions`, `GET /topics/:topicKey/subscriptions`, `DELETE /topics/:topicKey/subscriptions/:identifier` — `inbox.topic.controller.ts`
- Routes observed (cal.com): `POST /reservations`, `GET /reservations/:uid`, `PATCH /reservations/:uid`, `DELETE /reservations/:uid`, `POST /reserve`, `DELETE /selected-slot` — `slots.controller.ts`
- Routes observed (medusa): `GET /admin/subscriptions` (file-based router pattern)
- Example call chains (novu): `InboxController` → `SubscriptionService` → `SubscriptionRepository` → DATABASE → `RESPONSE`
