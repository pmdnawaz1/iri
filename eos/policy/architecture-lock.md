# Architecture Lock

The lock protects the meaning of the system. The protected set and its owning TSPECs
are generated into `eos/state/project.lock.yaml`.

## Protected artifacts

- Repository IR
- Requirement IR
- Ontology (capabilities, properties, constraints, aliases)
- Compiler pipeline & builder order
- Builder contracts
- Decision documents (`decision1.md`, `decision2.md`, `work_allocation*.md`)
- Capability definitions
- Execution closure rules
- Coverage rules
- Consistency rules
- Graph semantics

## Rule

Any change to a protected artifact requires:

1. A `ROLE_ARCHITECT` TSPEC describing the change.
2. An ADR (`eos/templates/adr-template.md`) recording the decision and migration.
3. A version bump of the affected artifact.

Until that TSPEC is merged, **all implementation touching the artifact is blocked**. The
architecture-lock CI validator rejects any PR that modifies a protected artifact without
an approved `ROLE_ARCHITECT` TSPEC reference in its commit trailer.

## Enforcement

- `ROLE_IMPLEMENTER` PRs that touch protected paths fail the architecture-lock gate.
- The Project Compiler ensures every protected artifact has an owning `TSPEC-A*`.
- Reviews verify `forbidden_changes` were respected.
