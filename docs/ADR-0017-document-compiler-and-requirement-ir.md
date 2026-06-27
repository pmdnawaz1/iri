# ADR-0017 — Document Compiler & Requirement IR Normalization

Status: Proposed · Owner: ROLE_ARCHITECT · TSPEC: elaborates A008; adds DN01, DF01–DF06

## Context

The deterministic *document ↔ code* comparison is the core promise of the project, yet no
document currently becomes a fact. `@rir/document-compiler` has only contracts. ADR-0009 left
the normalization rules unwritten. This ADR specifies them so the document side is buildable.

## Decision

### One shared ontology, two IRs

Documents do NOT get their own ontology. A document frontend extracts STRUCTURE; the
`RequirementNormalizer` maps extracted statements onto the SAME capability ontology that code
binds to, producing `RequirementIR`. Comparison is then a deterministic join on
`(feature, capability, constraint key)` — never NLP at compare time.

```
markdown/openapi/… → DocumentFrontend (structure) → ExtractedStatement[]
                   → RequirementNormalizer (rules below) → RequirementIR
```

### Normalization rules (deterministic, no inference at runtime)

A statement becomes zero or more requirement facts via a fixed, ordered ruleset:

1. **Capability binding.** Tokenize the statement + its heading path; resolve tokens against
   the ontology via `getCapability` / `resolveAlias` (e.g. heading "Login", verb "sign in" →
   `AUTH.LOGIN`). No match → no requirement (recorded as an UNMAPPED statement for review, see
   ADR-0018), never guessed.
2. **Constraint extraction.** Match the statement against the bound capability's declared
   `ConstraintDefinition`s using key synonyms + value enums declared in the ontology
   (e.g. "OTP is sent via email" + key `OTP_CHANNEL` with enum `EMAIL` → `OTP_CHANNEL=EMAIL`).
   Only ontology-declared keys/values are emitted.
3. **Priority.** MoSCoW keyword in the statement ("must"/"should"/"could"/"won't") → `Priority`;
   default `MUST`.
4. **Outputs.** Declared output tokens that appear in the ontology's `outputs` (e.g. "JWT").

Each fact carries `EvidenceIR { source: DOCUMENTATION, locator: "<file>#<ordinal>" }`.

### Conflict detection

Two requirement facts for the same `(capability, constraint key)` with different values →
a deterministic `CONSTRAINT_CONFLICT` (handled by the consistency engine, ADR-0011). This is
the "OTP via email" vs "OTP via SMS" example from `requirement.md`.

### The optional AI seam

Rule (1) tokenization MAY be assisted by `@rir/semantic` to *suggest* a binding, but the
suggestion is only accepted if it resolves to a declared ontology id; the LLM never invents
ids and never writes the Requirement IR. With AI off, normalization still runs on the
deterministic token rules (lower recall, identical precision).

## Invariants

1. No prose stored as truth; only ontology-bound facts with documentation evidence.
2. Document and Repository IR share ontology ids; comparison is set/graph logic.
3. Unmapped statements are surfaced, never silently dropped or guessed.

## Consequences / TSPECs

- **DF01** markdown frontend (structure) is the first, then DF02–DF06.
- **DN01** RequirementNormalizer implements the ruleset above.
- Cross-IR comparison is ADR-0020 / TSPEC-A020 + E07.
- Ontology coverage must grow (ADR-0018) or most statements stay UNMAPPED.
