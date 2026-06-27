# ADR-0010 — Coverage Rules

Status: Accepted · Owner: ROLE_ARCHITECT · TSPEC: TSPEC-A010

## Context
Coverage must be defined precisely and computed without inference.

## Decision
`@rir/coverage` defines requirement, implementation, documentation, test, and capability
coverage as ratios over canonical facts. `ratio(covered,total)` returns 1 when total is 0
(vacuously complete). `DefaultCoverageEngine` computes them by counting.

## Invariants
1. Definitions are architect-owned; computation is pure arithmetic.
2. Implementation coverage counts only CLOSED capabilities.
3. Capability coverage is over the ontology's total capabilities.

## Consequences
New coverage dimensions require an ADR; the arithmetic is implementer-maintainable.
