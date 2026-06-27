<!-- Repository-wide PR template. Every PR implements exactly one TSPEC. -->

## TSPEC

- **TSPEC ID:** TSPEC-XXXX
- **Owner role:** ROLE_ARCHITECT | ROLE_IMPLEMENTER
- **Branch:** `feature/tspec-xxxx-...` (from `main`, no stacked branches)
- **Wave / critical path:** wave-N / yes|no

## Architecture check (must all be true)

- [ ] No change to Repository IR / Requirement IR schema
- [ ] No change to ontology ids, properties, or constraints
- [ ] No change to compiler pipeline or builder order
- [ ] No change to closure / coverage / consistency rules
- [ ] No change to graph semantics
- [ ] Any protected change is justified by a `ROLE_ARCHITECT` TSPEC + ADR
- [ ] `forbidden_changes` from the TSPEC were respected

## Implementation check

- [ ] Matches the TSPEC `deliverables` and `outputs`
- [ ] Deterministic and idempotent
- [ ] No TODOs, no placeholder code, no dead code
- [ ] No AI used in compiler packages

## Tests

- [ ] Unit  [ ] Integration  [ ] Golden  [ ] Property  [ ] Performance  [ ] Regression
- [ ] Coverage ≥ 95%
- [ ] Golden snapshots updated and reviewed

## Gates (CI must be green)

- [ ] build · typecheck · lint
- [ ] unit / integration / golden tests
- [ ] `pnpm eos:compile` clean and artifacts up to date
- [ ] Repository IR / Requirement IR / Project IR validators
- [ ] closure · consistency · architecture-lock · dependency · TSPEC validators

## Review & merge checklist

- [ ] Architect review complete (`ARCHITECT_REVIEW → APPROVED`)
- [ ] Commit messages follow `type(tspec-id): summary`
- [ ] After merge: branch deleted, repository + project recompiled, next queue refreshed
