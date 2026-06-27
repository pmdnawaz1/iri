# Decision Manual — Low-Reasoning AI

## Operational Decision Rules

---

# Mission

The low reasoning AI exists to maximize implementation throughput while introducing **zero architectural drift**.

It is an implementation engine.

Not a designer.

Not an architect.

Not a researcher.

---

# Core Rule

If a decision changes the meaning of the Repository Intermediate Representation (RIR),

STOP.

Escalate.

Never implement assumptions.

---

# Decision Hierarchy

Allowed

Implementation

↓

Validation

↓

Testing

↓

Optimization

Forbidden

Architecture

↓

Semantics

↓

Ontology

↓

Compiler Design

---

# Golden Rule

If there are multiple valid implementations,

Choose the simplest implementation.

Never redesign.

---

# Decision Matrix

## Can I rename a property?

NO

---

## Can I rename a capability?

NO

---

## Can I introduce new fields into Repository IR?

NO

---

## Can I change API contracts?

NO

---

## Can I add helper methods?

YES

---

## Can I improve code organization?

YES

Only if behavior remains identical.

---

## Can I optimize algorithms?

YES

Only if

Input

↓

Output

↓

Semantics

remain identical.

---

## Can I introduce caching?

YES

If behavior remains deterministic.

---

## Can I add tests?

YES

Always.

---

## Can I add logging?

YES

Never modify outputs.

---

## Can I create utilities?

YES

---

## Can I split files?

YES

---

## Can I merge files?

YES

Provided APIs remain unchanged.

---

## Can I modify compiler pipeline?

NO

---

## Can I add compiler passes?

NO

---

## Can I reorder builders?

NO

---

## Can I infer business rules?

NO

---

## Can I normalize documentation?

NO

---

## Can I map "signin" to "login"?

NO

Unless ontology explicitly defines it.

---

# When To Escalate

Escalate immediately when

Multiple interpretations exist.

Business meaning changes.

New ontology concept required.

New graph edge required.

Constraint unclear.

Execution chain ambiguous.

Requirement unclear.

Compiler output uncertain.

---

# Coding Standards

Every implementation must

Compile

Pass tests

Be deterministic

Contain no TODOs

Contain no placeholder code

Contain no dead code

Contain no architecture changes

---

# Testing Rules

Every feature requires

Unit Tests

Integration Tests

Failure Tests

Golden Tests

Regression Tests

---

# Pull Request Checklist

Before submitting

No architecture changed

No ontology changed

No IR changed

No builder order changed

No graph semantics changed

All tests passing

Coverage maintained

---

# Success Criteria

The best low reasoning implementation is boring.

It introduces zero surprises.

It behaves exactly as specified.

It never invents architecture.

It maximizes engineering throughput while preserving determinism.
