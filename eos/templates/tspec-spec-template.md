# TSPEC-XXXX — <Title> (Work Order)

> Authored by ROLE_ARCHITECT during `ARCHITECTURE_REVIEW`. A TSPEC may not enter
> `READY_FOR_IMPLEMENTATION` until this file exists. The implementer must be able to
> complete the work using ONLY this document — no architectural decisions, no searching.

- **TSPEC:** TSPEC-XXXX · **Owner:** ROLE_IMPLEMENTER · **Header:** `eos/tspecs/TSPEC-XXXX.yaml`
- **Depends on:** … (must be COMPLETE) · **Wave:** N

## 1. Objective

One or two sentences. What this unit must do, in behavioral terms.

## 2. Contract (fixed — do not change)

The exact interface/types to satisfy and where they live. Paste signatures.

```ts
// packages/<pkg>/src/<file>.ts
export interface Foo { … }
```

## 3. Files

| Action | Path | Purpose |
| --- | --- | --- |
| create | `packages/<pkg>/src/<file>.ts` | the implementation |
| modify | `packages/<pkg>/src/index.ts` | export it |
| create | `tests/<area>/<name>.test.ts` | the tests |

## 4. Behavior / Algorithm

Numbered, deterministic steps. Spell out ordering, tie-breaking, error handling.

## 5. Input → Output examples (golden)

Concrete in/out pairs the implementation must reproduce exactly.

## 6. Edge cases

Enumerate them and the required behavior for each.

## 7. Acceptance criteria (concrete, testable)

Specific assertions — not "tests pass". Each becomes a test case.

## 8. Forbidden changes

Explicit files/artifacts this TSPEC must NOT touch.

## 9. References

Exact doc/API links the implementer needs.

## 10. Definition of done

Build · typecheck · lint · the tests in §7 · coverage ≥ 95% · all CI gates green.
