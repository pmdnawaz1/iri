# RIR Ontology Self-Evolution — Master Prompt

> Give this whole file to a capable AI (the semantic seam). Its job: compile real open-source
> repositories with `rir`, find capabilities the ontology does NOT yet cover, and **propose**
> additions. It PROPOSES; it never edits `packages/ontology`. A human architect accepts a
> proposal by turning it into a versioned ontology change + an ADR. (See `docs/ADR-0018`.)

---

## Why

The RIR ontology is the shared vocabulary of software capabilities (AUTH.LOGIN, PAYMENT.REFUND…).
Today it covers AUTH + commerce basics. To become the "LLVM of software repositories" it must
cover what real software actually does. Rather than guess, we **learn the ontology from real
repos**: compile them deterministically, see which routes/flows map to no capability, and grow
the ontology from those gaps — with a human in the loop.

The compiler is deterministic. **You (the AI) only operate at the proposal step.** You never
decide closure, never write IR, never edit the ontology files.

---

## The loop

```
for each repo:
  1. clone it (shallow) and locate its BACKEND/server source dir
  2. rir compile <backend-dir> --json > ir.json
  3. read ir.json: `routes` (every HTTP route found) and `mappedCapabilities`
     (routes that already resolved to an ontology capability)
  4. UNMAPPED = routes whose intent is not represented in mappedCapabilities
  5. cluster UNMAPPED routes by domain concept (e.g. /webhooks, /subscriptions, /teams)
  6. for each cluster, PROPOSE an ontology addition (format below) into
     docs/ontology-candidates/<FEATURE>.md   ← a review queue, never packages/ontology
human architect:
  7. review the queue; accept good proposals → add to packages/ontology + write an ADR +
     bump ONTOLOGY_VERSION. Re-compile: those routes now map; coverage grows.
```

## Setup (once)

Build and expose `rir` (see project README / `rir.cmd`). Then for any repo:

```bash
git clone --depth 1 <repo-url> /tmp/target
# IMPORTANT: point rir at the backend/server subdir, NOT a giant monorepo root.
rir compile /tmp/target/<server-subdir> --json > ir.json
```

`rir` parses .ts/.tsx/.js/.jsx/.py/.java/.go/.rs/.cs. Pick the subdir that holds the HTTP
routes (e.g. `packages/medusa/src/api`, `apps/server`, `src/routes`, `internal/handler`).

## What to read from `ir.json`

- `routes`: array of every `"<METHOD> <path>"` discovered.
- `mappedCapabilities`: ontology ids that were discovered (already covered).
- `ir.capabilities`: the bound capabilities + their closure.
- `ir.nodes` / `ir.edges`: the call graph, if you need to understand a route's chain.

A route in `routes` whose concept is **not** in `mappedCapabilities` is a candidate.

## Proposal format (write to `docs/ontology-candidates/<FEATURE>.md`)

Mirror the ontology's `CapabilityDefinition` shape (see `packages/ontology/src/index.ts`). Use
canonical **software** concepts (SUBSCRIPTION.CREATE), never framework names (StripeWebhook).

```md
# Candidate feature: SUBSCRIPTION

- Source repos: medusa (POST /subscriptions, DELETE /subscriptions/:id), cal.com (...)
- Rationale: appears across N independent repos (cross-repo value, per ADR-0018).

## Proposed capabilities
- SUBSCRIPTION.CREATE   aliases: ["subscribe","subscriptions"]   chain: BACKEND
- SUBSCRIPTION.CANCEL   aliases: ["unsubscribe"]                 chain: BACKEND
- SUBSCRIPTION.UPDATE   aliases: []                              chain: BACKEND

## Proposed constraints (if any, with ontology-typed enums)
- BILLING_INTERVAL = ENUM[MONTH, YEAR]

## Evidence
- routes observed: [...]; example call chains: [...]
```

Rules for proposals:
- Only propose a feature if it shows up in **2+ independent repos** (cross-repo value).
- Reuse existing features when possible (e.g. a `/refund` route → `PAYMENT.REFUND`, already in
  the ontology — that's a *discovery* gap (A017), report it as "EXISTING, discovery miss", do
  NOT propose a duplicate).
- Default `chain: BACKEND` = `[BACKEND_ROUTE, CONTROLLER, SERVICE, REPOSITORY, DATABASE, RESPONSE]`.
- Never invent constraint enums not grounded in the code.

## Hard invariants (do not break)

1. You may READ the IR and WRITE proposals to `docs/ontology-candidates/` only.
2. You NEVER edit `packages/ontology`, the IR, or any compiler code.
3. Capability ids are canonical software concepts, lowercase-free, FEATURE.CAPABILITY.
4. No proposal without route/code evidence from `ir.json`.

---

## Seed repositories (supported languages; compile a backend subdir of each)

| Domain | Repo | Language | Suggested subdir |
| --- | --- | --- | --- |
| E-commerce | https://github.com/medusajs/medusa | TS | `packages/medusa/src/api` |
| E-commerce | https://github.com/vendure-ecommerce/vendure | TS | `packages/core/src` |
| E-commerce | https://github.com/saleor/saleor | Python | `saleor/graphql` |
| CRM | https://github.com/twentyhq/twenty | TS | `packages/twenty-server/src` |
| Scheduling | https://github.com/calcom/cal.com | TS | `apps/api` |
| Headless CMS | https://github.com/directus/directus | TS | `api/src` |
| Headless CMS | https://github.com/strapi/strapi | JS/TS | `packages/core` |
| Identity/Auth | https://github.com/ory/kratos | Go | `selfservice` |
| Identity/Auth | https://github.com/supabase/auth | Go | `internal/api` |
| Git hosting | https://github.com/go-gitea/gitea | Go | `routers` |
| Notifications | https://github.com/novuhq/novu | TS | `apps/api/src` |
| Workflow automation | https://github.com/n8n-io/n8n | TS | `packages/cli/src` |
| Surveys/Forms | https://github.com/formbricks/formbricks | TS | `apps/web/app/api` |
| Project mgmt | https://github.com/makeplane/plane | Python | `apiserver/plane/api` |
| Spring reference | https://github.com/spring-projects/spring-petclinic | Java | `src/main/java` |
| FastAPI reference | https://github.com/fastapi/full-stack-fastapi-template | Python | `backend/app/api` |

> These span auth, payments, subscriptions, orders, carts, inventory, teams, webhooks,
> notifications, files, comments, tags, search — the concepts the ontology must learn. Compile
> several, diff `routes` against `mappedCapabilities`, and let the gaps drive the proposals.

## Frontend repositories (for the full-stack DAG)

Point `rir` at the **frontend app** dir (components, routers, `fetch`/`axios` calls). The
frontend DAG produces FRONTEND_ROUTE / COMPONENT / HANDLER / API_CALL / FRONTEND_STATE /
RENDERED_UI nodes. Compile the frontend **and** backend of the SAME product together (one
`rir compile` over a dir that contains both, or merge their IRs) to let a capability reach
`CLOSED` across all 12 stages.

| Domain | Repo | Frontend | Suggested subdir |
| --- | --- | --- | --- |
| E-commerce storefront | https://github.com/vercel/commerce | Next/React | `components`, `app` |
| Admin / internal tools | https://github.com/appsmithorg/appsmith | React (TS) | `app/client/src` |
| Low-code framework | https://github.com/refinedev/refine | React (TS) | `packages/core/src` |
| Docs e-sign | https://github.com/documenso/documenso | Next (TS) | `apps/web/src` |
| Links/analytics | https://github.com/dub/dub | Next (TS) | `apps/web/app` |
| CRM (web) | https://github.com/twentyhq/twenty | React (TS) | `packages/twenty-front/src` |
| Project mgmt (web) | https://github.com/makeplane/plane | Next (TS) | `web/core` |
| Vue admin | https://github.com/PanJiaChen/vue-element-admin | Vue (JS) | `src` |
| Vue/TS data platform | https://github.com/nocodb/nocodb | Vue (TS) | `packages/nc-gui` |

## Use the UNMAPPED records — never miss

The compiler **never silently drops a route**. Any route that resolves to no ontology id is
emitted as a capability with `feature: "UNMAPPED"` and `capability: "UNMAPPED.<METHOD>_<PATH>"`
(closure `ORPHAN`). In `ir.json`, scan `ir.capabilities` for `feature === "UNMAPPED"`: that IS
your candidate worklist. Cluster the UNMAPPED entries by concept and propose ontology for them.
(If an UNMAPPED route is actually a concept the ontology already has, that's a *discovery* miss,
not a new feature — note it so discovery signals can be improved, don't propose a duplicate.)

## Expected first-pass gaps (likely new features to propose)

SUBSCRIPTION, WEBHOOK, TEAM / ORGANIZATION, MEMBERSHIP / INVITE, FILE / UPLOAD, COMMENT, TAG /
LABEL, SEARCH, SHIPPING / FULFILLMENT, DISCOUNT / PROMOTION, REVIEW / RATING, MESSAGE / CHAT,
SCHEDULE / BOOKING, API_KEY / TOKEN, WORKFLOW / AUTOMATION.

Propose each only with cross-repo evidence, in the format above. The architect accepts, the
ontology grows, and the next compile run covers more of the world.
