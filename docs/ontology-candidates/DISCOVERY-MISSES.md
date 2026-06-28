# Frontend DAG — Discovery miss report (EXISTING capabilities, not new proposals)

This file documents routes from the frontend repository scan (documenso, cal.com, twenty-front)
that resolve to **existing ontology capabilities** but were NOT discovered by the compiler.
These are **discovery signal gaps (ADR-0018 §A017)**, not new features — the architect should
improve the discovery cascade, not add duplicate capabilities.

---

## DISCOVERY MISS 1: AUTH.LOGIN via frontend sign-in page

**Repo**: `documenso` (`apps/web/src`)
**Evidence**: Next.js `app/(auth)/sign-in/page.tsx` — renders a login form; makes `POST /api/auth/callback/credentials` via NextAuth.
**Existing capability**: `AUTH.LOGIN` (already in ontology)
**Why missed**: The compiler sees neither the frontend form component (`COMPONENT` node) nor the `API_CALL` edge to `POST /api/auth/callback/credentials` (a next-auth internal endpoint, not an explicit `fetch`/`axios` call pattern).
**Fix**: Improve `ComponentPass` to recognise NextAuth form actions as `AUTH.LOGIN` API calls, OR improve alias discovery to include `credentials`, `sign-in`, `sign_in` in the `AUTH.LOGIN` aliases (note: `sign_in` is already declared — the miss is at the COMPONENT→API_CALL edge level).

---

## DISCOVERY MISS 2: AUTH.REGISTER via frontend sign-up page

**Repo**: `documenso` (`apps/web/src`)
**Evidence**: `app/(auth)/sign-up/page.tsx` — registration form → `POST /api/auth/register`
**Existing capability**: `AUTH.REGISTER`
**Why missed**: Same as above — the frontend COMPONENT → API_CALL → BACKEND_ROUTE chain is not being built by the current adapter for Next.js App Router patterns.

---

## DISCOVERY MISS 3: PAYMENT.CREATE_PAYMENT via Stripe integration

**Repo**: `cal.com` (`apps/api/v2/src`)
**Evidence**: `GET /stripe/check`, `GET /stripe/connect`, `GET /stripe/save`, `GET /payment/:uid` — `stripe.controller.ts`
**Existing capability**: `PAYMENT.CREATE_PAYMENT` (already in ontology, alias: `pay`, `payment`, `charge`)
**Why missed**: The route `/payment/:uid` maps to `PAYMENT.CREATE_PAYMENT` by the `alias = payment` rule. The compiler missed it because the `GET /payment/:uid` route path segment `payment` is in singular already, but the alias table uses `payment` (lowercase). Investigation shows the CapabilityPass `resolveRoute` correctly lower-cases and checks aliases — likely missed because the `cal.com/apps/api/v2` subdir compile picked up env-config files instead of actual controller files. The `--json` output showed only env-var routes.
**Fix**: Ensure the compiler points at `src/` subdirectory, not the monorepo app root.

---

## DISCOVERY MISS 4: PAYMENT.REFUND / PAYMENT.CAPTURE via medusa

**Repo**: `medusa` (`packages/medusa/src/api`)
**Evidence**: `GET /admin/payments/:id/capture`, `GET /admin/payments/:id/refund`, `GET /admin/payments`, `POST /admin/payments/:id/capture`, `POST /admin/payments/:id/refund`
**Existing capability**: `PAYMENT.CAPTURE`, `PAYMENT.REFUND` (both in ontology)
**Why missed**: Medusa uses file-based routing (exported `GET`, `POST` from `route.ts`). The TypeScript adapter currently only detects `app.get()`/`router.post()` style route registrations. File-based route detection needs to be added to the TS adapter.
**Fix** (TSPEC-A017 signal): Add file-based route detection to `TypeScriptAdapter` — when a file is named `route.ts` and exports `GET`/`POST`/`DELETE`, infer the HTTP method from the export name and the path from the directory relative to the API root.

---

## DISCOVERY MISS 5: ORDER.CREATE / ORDER.CANCEL via medusa + cal.com

**Repo**: `medusa`
**Evidence**: `POST /admin/orders` (draft), `POST /admin/draft-orders`, `DELETE /admin/orders/:id/cancel` (via dedicated file-based routes)
**Existing capability**: `ORDER.CREATE`, `ORDER.CANCEL`
**Why missed**: Same file-based routing gap as MISS 4.

---

## Summary of required discovery improvements

| Signal | Fix |
|---|---|
| Next.js App Router file-based routing | Add `route.ts` exported-verb detection to `TypeScriptAdapter` |
| NextAuth form action as API_CALL | Detect `signIn()` / `signUp()` NextAuth calls as implicit API_CALL edges |
| NestJS decorator routing | Add `@Get()`, `@Post()` decorator pattern to `TypeScriptAdapter` (currently missed unless controller name matches) |
| File root vs. src subdir | Ensure `rir compile` is pointed at `src/` not monorepo app root |
