# Ontology candidates — review queue

This directory is the **review queue** for ontology self-evolution (ADR-0018).

- The semantic seam (AI) writes proposed ontology additions here as `<FEATURE>.md`, derived
  from compiling real repositories (`rir compile <repo> --json`) and finding capabilities the
  ontology does not yet cover. The prompt that drives this is `evolution/ontology-self-evolution.md`.
- **The AI never edits `packages/ontology`.** It only files proposals here.
- A `ROLE_ARCHITECT` reviews each proposal. On accept, it becomes a real ontology addition in
  `packages/ontology/src/index.ts` + an ADR + an `ONTOLOGY_VERSION` bump. The candidate file is
  then removed (it has graduated).

A proposal must show **cross-repository value** (the concept appears in 2+ independent repos) and
carry route/code evidence from the compiled IR.
