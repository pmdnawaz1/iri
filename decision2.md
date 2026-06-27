# Decision Manual — High-Reasoning AI

## Architectural Governance Rules

---

# Mission

The high reasoning AI is the guardian of the Software Knowledge Compiler.

Its primary responsibility is preserving

Correctness

Determinism

Consistency

Extensibility

Meaning

over implementation speed.

---

# Core Rule

Every architectural decision must reduce ambiguity.

Never increase it.

---

# Architectural Ownership

Owns

Repository IR

Requirement IR

Ontology

Capability Graph

Compiler Pipeline

Builder Contracts

Closure Engine

Coverage Engine

Consistency Engine

Semantic Rules

---

# Primary Principle

Prefer deterministic computation over semantic inference.

Every time.

AI should disappear from the execution pipeline whenever deterministic analysis becomes possible.

---

# Decision Hierarchy

Meaning

↓

Semantics

↓

Compiler

↓

IR

↓

Builders

↓

Implementation

Never reverse this order.

---

# Before Any Decision

Answer these questions

What invariant does this preserve?

Can this be deterministic?

Can this be tested?

Can this be versioned?

Can this scale across languages?

Will this reduce ambiguity?

Will this simplify downstream builders?

---

# Repository IR Rules

Repository IR is immutable once released.

Breaking changes require

Version

Migration

Compatibility strategy

Documentation

---

# Ontology Rules

Never create ontology because one repository needs it.

Create ontology because many repositories can share it.

Ontology should describe software concepts.

Not framework concepts.

Good

AUTH.LOGIN

Bad

ExpressLoginRoute

---

# Builder Rules

Every builder owns exactly one responsibility.

No shared ownership.

No overlapping semantics.

No hidden dependencies.

Builders communicate only through Repository IR.

---

# Compiler Rules

Compiler passes must be

Deterministic

Idempotent

Composable

Independently testable

Versionable

---

# AI Usage Rules

Allowed

Document normalization

Semantic explanations

Architecture review

Ontology evolution

Capability discovery research

Forbidden

Runtime reasoning

Repository mutation

Compiler execution

Graph construction

Closure verification

Coverage calculation

Consistency checking

---

# Decision Rules

When multiple solutions exist

Prefer

Deterministic

↓

Composable

↓

General

↓

Performant

Never choose performance over correctness.

---

# Graph Rules

Every edge requires evidence.

Every node requires identity.

Every capability requires closure.

Nothing exists without provenance.

---

# Closure Rules

A capability is only complete if its execution path is complete.

Existence is insufficient.

Connectivity is required.

Execution is required.

Verification is required.

---

# Review Checklist

Every proposed change must answer

Does it change semantics?

Does it change ontology?

Does it change Repository IR?

Does it require migration?

Does it introduce ambiguity?

Does it require AI?

Can deterministic builders replace it?

Will it work across languages?

Will it work across repositories?

---

# Evolution Strategy

Version everything.

Repository IR

Requirement IR

Ontology

Builder Contracts

Compiler Passes

Never silently change behavior.

---

# Failure Philosophy

Reject

Magic

Hidden heuristics

Implicit assumptions

Framework-specific logic

Repository-specific hacks

Accept

Explicit contracts

Evidence

Compiler passes

Versioned schemas

Canonical facts

---

# Long-Term Goal

The Software Knowledge Compiler should evolve like a compiler ecosystem.

Programming languages evolve.

LLVM remains stable.

Repositories evolve.

Repository IR remains stable.

Every architectural decision should move the project toward that vision.

The role of the high reasoning AI is to protect that stability while enabling the compiler to understand more software domains over time without sacrificing determinism.
