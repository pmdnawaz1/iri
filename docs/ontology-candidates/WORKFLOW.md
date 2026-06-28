# Candidate feature: WORKFLOW / AUTOMATION

- Source repos:
  - **novu** (POST /workflows, GET /workflows, GET /:workflowId, PUT /:workflowId, DELETE /:workflowId, POST /:workflowId/duplicate, PUT /:workflowId/sync — `workflow.controller.ts`; POST /trigger, POST /trigger/broadcast, POST /trigger/bulk — `events.controller.ts`; POST /sync, POST /validate — `bridge.controller.ts`)
  - **medusa** (POST /admin/order-edits, POST /admin/order-changes, GET /admin/core-flows — workflow step routes)
  - **directus** (GET /:provider/projects/:id/runs, GET /:provider/projects/:id/runs/stats, GET /:provider/runs/:id, POST /:provider/projects/:id/deploy — flow/deploy runs)
- Rationale: Workflow definition, trigger, and execution appears prominently in novu (notification workflows), medusa (order processing flows), and directus (deployment pipelines). Automation is a clear cross-repo concept.

## Proposed capabilities
- `WORKFLOW.CREATE`    aliases: `["workflow", "workflows", "automation"]`     chain: BACKEND
- `WORKFLOW.UPDATE`    aliases: `[]`                                            chain: BACKEND
- `WORKFLOW.DELETE`    aliases: `[]`                                            chain: BACKEND
- `WORKFLOW.TRIGGER`   aliases: `["trigger", "execute", "run"]`               chain: BACKEND
- `WORKFLOW.PAUSE`     aliases: `["pause"]`                                    chain: BACKEND
- `WORKFLOW.LIST`      aliases: `[]`                                            chain: BACKEND
- `WORKFLOW.GET_RUNS`  aliases: `["runs", "executions"]`                       chain: BACKEND

## Proposed constraints (if any, with ontology-typed enums)
- `TRIGGER_TYPE`   = ENUM[EVENT, SCHEDULE, MANUAL, WEBHOOK]
- `WORKFLOW_STATUS` = ENUM[ACTIVE, PAUSED, DRAFT, ARCHIVED]

## Evidence
- Routes observed (novu): `POST /workflows`, `GET /workflows`, `PUT /:workflowId`, `DELETE /:workflowId`, `POST /:workflowId/duplicate`, `PUT /:workflowId/sync` — `workflow.controller.ts`
- Routes observed (novu): `POST /trigger`, `POST /trigger/broadcast`, `POST /trigger/bulk`, `DELETE /trigger/:transactionId` — `events.controller.ts`
- Routes observed (novu): `POST /sync`, `POST /validate` — `bridge.controller.ts`
- Routes observed (directus): `GET /:provider/projects/:id/runs`, `GET /:provider/projects/:id/runs/stats`, `POST /:provider/projects/:id/deploy` — flow runners
- Routes observed (medusa): core-flows order change processing — file-based router
- Example call chains (novu): `WorkflowController` → `WorkflowService` → `WorkflowRepository` → DATABASE → `RESPONSE`
