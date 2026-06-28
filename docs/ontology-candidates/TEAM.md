# Candidate feature: TEAM / ORGANIZATION

- Source repos:
  - **medusa** (POST /admin/users, GET /admin/users, POST /admin/invites, GET /admin/invites, DELETE /admin/invites/:id — `route.ts`)
  - **cal.com** (POST /teams, GET /teams, PATCH /:teamId, DELETE /:teamId, POST /teams/:teamId/publish — team management; POST /organizations, GET /organizations — org management)
  - **novu** (GET /organization, PATCH /organization, POST /organizations, GET /organizations, POST /organizations/:orgId/members — `organization.controller.ts`)
  - **directus** (POST /users, GET /users, PATCH /:id, POST /invite, POST /invite-accept, POST /roles — `users-controller`, `roles-controller`)
  - **formbricks** (GET /organizations/:organizationId/workspace-teams, POST /..., PATCH /..., DELETE /... — `workspace-teams` module)
- Rationale: Team/organization management with member invite flows appears across 5 independent repos. This is a universal multi-tenant SaaS pattern.

## Proposed capabilities
- `TEAM.CREATE`          aliases: `["team", "teams", "organization", "organizations"]`   chain: BACKEND
- `TEAM.UPDATE`          aliases: `[]`                                                    chain: BACKEND
- `TEAM.DELETE`          aliases: `[]`                                                    chain: BACKEND
- `TEAM.LIST`            aliases: `[]`                                                    chain: BACKEND
- `TEAM.INVITE_MEMBER`   aliases: `["invite", "invites"]`                                chain: BACKEND
- `TEAM.REMOVE_MEMBER`   aliases: `[]`                                                    chain: BACKEND
- `TEAM.LIST_MEMBERS`    aliases: `["members"]`                                           chain: BACKEND

## Proposed constraints (if any, with ontology-typed enums)
- `MEMBER_ROLE` = ENUM[OWNER, ADMIN, MEMBER, VIEWER, GUEST]
- `INVITE_STATUS` = ENUM[PENDING, ACCEPTED, DECLINED, EXPIRED]

## Evidence
- Routes observed (medusa): `POST /admin/invites`, `GET /admin/invites`, `DELETE /admin/invites/:id`, `POST /admin/users`, `GET /admin/users` — file-based router
- Routes observed (cal.com): `POST /teams`, `GET /teams`, `PATCH /:teamId`, `DELETE /:teamId`, `POST /organizations`, `GET /organizations` — team/org controllers
- Routes observed (novu): `GET /organization`, `PATCH /organization`, `POST /organizations/:orgId/members` — `organization.controller.ts`
- Routes observed (directus): `POST /users`, `GET /users`, `PATCH /:id`, `POST /invite`, `POST /invite-accept`, `POST /roles` — users + roles controllers
- Routes observed (formbricks): `GET /organizations/:organizationId/workspace-teams`, `POST`, `PATCH`, `DELETE` — workspace-teams module
- Example call chains (novu): `OrganizationController` → `OrganizationService` → `MemberRepository` → DATABASE → `RESPONSE`
