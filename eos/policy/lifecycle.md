# TSPEC Lifecycle (State Machine)

The only legal states and transitions. The machine is encoded in
`eos/compiler/state-machine.ts`; any transition not listed is invalid and must be
rejected by the validator.

## Happy path

```
DRAFT
→ ARCHITECTURE_REVIEW
→ READY_FOR_IMPLEMENTATION
→ IMPLEMENTING
→ CODE_COMPLETE
→ TESTS_COMPLETE
→ REVIEW_PENDING
→ ARCHITECT_REVIEW
→ APPROVED
→ MERGED_TO_MAIN
→ GRAPH_RECOMPILED
→ DEPENDENCIES_UPDATED
→ NEXT_TSPECS_UNLOCKED
→ COMPLETE
```

## Failure path

```
ARCHITECT_REVIEW → CHANGES_REQUESTED → IMPLEMENTING
ARCHITECTURE_REVIEW → CHANGES_REQUESTED → IMPLEMENTING
```

## Rules

- A TSPEC may only advance one legal edge at a time.
- `MERGED_TO_MAIN` automatically triggers the Repository Compiler pipeline
  (`eos/policy/ci-gates.md`), which performs `GRAPH_RECOMPILED → DEPENDENCIES_UPDATED →
  NEXT_TSPECS_UNLOCKED`.
- A TSPEC may not enter `READY_FOR_IMPLEMENTATION` until every `depends_on` TSPEC is
  `COMPLETE`. This is what the wave ordering guarantees.
- An implementer TSPEC (`spec_required: true`) may not enter
  `READY_FOR_IMPLEMENTATION` until its **work order** exists at `spec_path`
  (`eos/specs/<id>.spec.md`, `spec_status: WRITTEN`). Authoring the work order IS the
  `ARCHITECTURE_REVIEW → READY_FOR_IMPLEMENTATION` transition. Template:
  `eos/templates/tspec-spec-template.md`; worked example: `eos/specs/TSPEC-I004.spec.md`.
  `project.health.yaml` reports `work_order_coverage_pct`.
- Only `ROLE_ARCHITECT` may move a TSPEC out of `ARCHITECTURE_REVIEW` or
  `ARCHITECT_REVIEW`.
