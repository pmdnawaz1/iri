# TSPEC-I007 — Ontology validators (Work Order)

> Authored by ROLE_ARCHITECT. Implement using ONLY this document. No architectural
> decisions; if ambiguous, STOP and escalate.

- **TSPEC:** TSPEC-I007 · **Owner:** ROLE_IMPLEMENTER · **Header:** `eos/tspecs/TSPEC-I007.yaml`
- **Depends on:** TSPEC-A003 — COMPLETE · **Wave:** 2

## 1. Objective

Validate the internal integrity of the capability ontology (`ONTOLOGY`) deterministically,
so a malformed ontology is caught in CI rather than at runtime.

## 2. Contract (fixed — do not change)

Use existing exports from `@rir/ontology` (`ONTOLOGY`, `allCapabilities`,
`ConstraintType`, types). Add:

```ts
export interface OntologyProblem { readonly code: string; readonly subject: string; readonly message: string; }
export function validateOntology(): readonly OntologyProblem[]; // empty array = valid
```

`code` ∈ `"DUPLICATE_FEATURE" | "DUPLICATE_CAPABILITY" | "DUPLICATE_ALIAS" |
"EMPTY_CHAIN" | "ENUM_WITHOUT_VALUES" | "NON_ENUM_WITH_VALUES"`.

## 3. Files

| Action | Path | Purpose |
| --- | --- | --- |
| create | `packages/ontology/src/validators.ts` | `validateOntology` |
| modify | `packages/ontology/src/index.ts` | export it |
| create | `tests/ontology/ontology-validators.test.ts` | tests from §7 |

## 4. Behavior / Algorithm

Iterate `ONTOLOGY` once and collect problems (do not throw):
1. **DUPLICATE_FEATURE**: feature `id` seen more than once.
2. **DUPLICATE_CAPABILITY**: capability `id` seen more than once across all features.
3. **DUPLICATE_ALIAS**: the same alias (case-insensitive) declared on two capabilities.
4. **EMPTY_CHAIN**: a capability with an empty `expectedChain`.
5. **ENUM_WITHOUT_VALUES**: a constraint with `type === ENUM` and empty `enumValues`.
6. **NON_ENUM_WITH_VALUES**: a constraint with `type !== ENUM` and non-empty `enumValues`.

Return all problems found, in deterministic discovery order. The shipped `ONTOLOGY` must
return `[]`.

## 5. Input → Output examples (golden)

- `validateOntology()` → `[]` (the real ontology is valid).
- A locally-constructed feature list with a duplicate capability id (built in the test,
  not added to the package) → a `DUPLICATE_CAPABILITY` problem. (If the implementation
  only validates the global `ONTOLOGY`, expose an internal `validateFeatures(features)`
  helper the test can call with a crafted list.)

## 6. Edge cases

- A capability with zero constraints is valid.
- Aliases compare case-insensitively (`SignIn` == `signin`).

## 7. Acceptance criteria (each is a test)

1. `validateOntology()` returns `[]` for the shipped ontology.
2. duplicate capability id → `DUPLICATE_CAPABILITY`.
3. duplicate alias → `DUPLICATE_ALIAS`.
4. ENUM constraint with no values → `ENUM_WITHOUT_VALUES`.
5. empty expected chain → `EMPTY_CHAIN`.
6. output is deterministic (stable order across runs).
7. coverage for `validators.ts` ≥ 95%.

## 8. Forbidden changes

- Do NOT modify the ontology content or any ontology type (TSPEC-A003).
- Do NOT touch packages other than `ontology`.

## 9. References

- Existing ontology source: `packages/ontology/src/index.ts`.

## 10. Definition of done

build · typecheck · lint · the §7 tests · coverage ≥ 95% · PR `feat(tspec-i007): ontology validators`.
