# Release Strategy

## Milestones (by wave)

| Milestone | Waves | Gate |
| --- | --- | --- |
| M0 Architecture frozen | 0–2 (architect contracts) | All `TSPEC-A*` accepted; IR/ontology/closure ADRs merged. |
| M1 Foundation | 2–4 (common, ir, graph, storage, core, builder-engine) | Foundation packages green; SQLite storage live. |
| M2 Frontends & passes | 5 (adapters, doc frontends, passes) | TypeScript adapter + markdown frontend + all passes green. |
| M3 Engines & apps | 6–7 (closure/coverage/consistency/query, cli, api) | End-to-end compile of a fixture to CLOSED. |
| M4 Hardening | 8 (fixtures, benchmarks, scripts) | Golden fixtures + benchmarks; health GREEN. |

## Versioning (semantic)

- **Repository IR**, **Requirement IR**, **Ontology** each version independently.
- IR is immutable once released; breaking changes require MAJOR bump + migration + ADR.
- Additive ontology capabilities are MINOR; clarifications are PATCH.
- Repository releases are tagged `v<major>.<minor>.<patch>` and recorded in
  `project.versions.yaml`.

## Repository snapshots & rollback

- Every release produces a `SnapshotIR` (content-addressed) stored via `@rir/storage`.
- Rollback = check out the prior snapshot + prior IR versions; deterministic and lossless.

## Compatibility matrix

| Consumer | Requires |
| --- | --- |
| CLI / API | RIR ≥ released MAJOR |
| Snapshots | same RIR MAJOR (migrate across MAJOR) |
| Ontology bindings | ontology MAJOR compatible |

## Migration strategy

Breaking IR/ontology changes ship with a migration TSPEC (`ROLE_IMPLEMENTER`) that
upgrades stored snapshots; no silent behavior changes.
