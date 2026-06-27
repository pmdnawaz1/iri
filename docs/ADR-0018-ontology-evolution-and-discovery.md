# ADR-0018 — Ontology Expansion, Capability Discovery & Self-Evolution

Status: Proposed · Owner: ROLE_ARCHITECT · TSPEC: A016, A017, A018

## Context

The ontology contains one feature (`AUTH`), and discovery resolves a route only by exact
name/alias. So the compiler "only detects AUTH". This ADR decides how the ontology gains
coverage AND how it grows from real repositories without an AI ever writing it.

## Decision

### 1. Expansion (TSPEC-A016) — manual, architect-owned

Add the canonical features from `requirement.md` as ontology content: `PAYMENT`
(CREATE_PAYMENT, CAPTURE, REFUND, CANCEL), `ORDER` (CREATE, UPDATE, CANCEL), `CART`,
`CHECKOUT`, `INVENTORY`, `PROFILE`, `NOTIFICATION`. Each with an `expectedChain`, constraints,
outputs, and aliases — exactly like AUTH. This is content, written by the architect, versioned
(ontology MINOR bump). Created because *many repositories* share these concepts, not one
(decision2 "Ontology Rules").

### 2. Discovery signals (TSPEC-A017) — deterministic, multi-signal

CapabilityPass resolves a route to a capability using an ordered signal cascade, all
deterministic and ontology-gated:

1. exact name/alias of the path's last segment (today's rule);
2. `<HTTP verb> + <path noun>` → ontology (e.g. `POST /orders` → `ORDER.CREATE`,
   `DELETE /orders/:id` → `ORDER.CANCEL`) via a fixed verb→capability-name map per feature;
3. handler/controller class name (e.g. `PaymentController.refund` → `PAYMENT.REFUND`);
4. participating table/SQL names from SQLPass (e.g. an `orders` table in the chain).

First match wins; no match → ORPHAN_CAPABILITY (below). The cascade is architect-owned; the
implementer applies it exactly.

### 3. Self-evolution (TSPEC-A018) — AI proposes, architect accepts

The system grows the ontology from real repos WITHOUT the AI writing it:

```
compile → routes/subgraphs that resolve to NO ontology id are emitted as
          ORPHAN_CAPABILITY records (deterministic, part of the IR)
       → @rir/semantic (the ONLY AI boundary, read-only) summarizes each orphan subgraph
          and PROPOSES a candidate: { suggestedFeature, suggestedCapability, expectedChain,
          constraints }
       → the proposal is appended to docs/ontology-candidates/ (a REVIEW QUEUE file),
          never to packages/ontology
       → ROLE_ARCHITECT reviews; on accept it becomes a real ontology addition + an ADR
          (a versioned change, like A016)
```

Invariants preserved: the compiler/closure/coverage never depend on the AI; with AI off,
orphans are still reported (just not auto-proposed); the ontology only ever changes through a
human-reviewed, versioned ADR.

## Invariants

1. Discovery is deterministic and ontology-gated; ids are never invented at compile time.
2. AI may only READ and PROPOSE; it never writes the ontology or the IR.
3. Every ontology change is versioned with an ADR and motivated by cross-repository value.

## Consequences

- `ClosureState` gains no new value; orphan capabilities use the existing `ORPHAN` semantics
  plus an `ORPHAN_CAPABILITY` record for the evolution queue (an IR addition → versioned).
- Coverage immediately improves once A016 lands; discovery quality improves with A017;
  the system becomes self-improving (proposals) with A018.
