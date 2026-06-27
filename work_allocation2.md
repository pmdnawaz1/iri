# Work Allocation for High-Reasoning AI

## (Claude Opus 4.x / GPT-5.5 / Gemini 2.5 Pro / o3-class models)

---

# Philosophy

The High-Reasoning AI is **not a programmer**.

It is the project's

* Compiler Architect
* Language Designer
* Ontology Designer
* IR Designer
* Static Analysis Researcher
* Verification Engineer

It should write **very little code** compared to the low reasoning AI.

Instead, it should design systems that thousands of lines of deterministic code can implement.

Expected contribution:

~20% of repository code

~95% of architectural decisions

---

# Primary Responsibilities

The high reasoning AI owns every decision that changes the meaning of Repository IR.

Anything that changes semantics must pass through it.

---

# Owns Repository IR

Design

Repository IR

Requirement IR

Capability IR

Evidence IR

Snapshot IR

Execution IR

No low reasoning model may modify these.

---

# Owns Compiler Architecture

Designs

Compiler pipeline

Builder order

Pass ordering

Dependency graph

Plugin system

Incremental compilation

Caching strategy

Snapshot architecture

---

# Owns Ontology

Defines

Capability hierarchy

Property hierarchy

Constraint hierarchy

Relationship hierarchy

Alias strategy

Normalization rules

Versioning

Deprecation

Inheritance

Example

AUTH

↓

LOGIN

↓

OTP

↓

CHANNEL

Only the high reasoning model can introduce or rename ontology concepts.

---

# Owns Document Compiler Semantics

Determines

How statements become assertions

How assertions become Requirement IR

Normalization rules

Conflict rules

Scope rules

Requirement inheritance

Example

"OTP should be sent via email."

↓

AUTH.LOGIN

OTP_CHANNEL

EMAIL

The extraction strategy belongs here.

---

# Owns Capability Discovery

Determines

How capabilities are inferred from code

Behavioral signatures

Execution signatures

Feature boundaries

Cross-language mapping

Module detection

This is not parser work.

It is compiler reasoning.

---

# Owns Closure Engine

Designs

Execution Closure

Capability Closure

Requirement Closure

Cross-artifact Closure

Defines

Expected execution chains

Acceptable gaps

Partial implementations

Failure conditions

Broken path detection

---

# Owns Consistency Engine

Defines

What constitutes

Conflict

Coverage

Implementation

Contradiction

Mismatch

Constraint violation

Example

Route mismatch

Capability match

↓

No failure

Capability mismatch

↓

Failure

These rules are architectural.

---

# Owns Coverage Engine

Defines

Requirement coverage

Implementation coverage

Documentation coverage

Frontend coverage

Backend coverage

Database coverage

API coverage

Capability coverage

Not implementation.

Definition.

---

# Owns Graph Model

Determines

Node types

Edge types

Traversal semantics

Evidence propagation

Graph normalization

Reachability semantics

Subgraph extraction

Graph versioning

---

# Owns Builder Contracts

Defines

Builder responsibilities

Builder inputs

Builder outputs

Builder ordering

Builder dependencies

Builder priorities

No builder overlap allowed.

---

# Owns Language Adapter Contracts

Defines

What every adapter must expose

Never implements adapters.

Only specifies

```text id="bnylqv"
parse()

symbols()

types()

calls()

imports()

exports()

routes()
```

---

# Owns Query Language

Designs

Graph query model

Capability queries

Evidence queries

Closure queries

Coverage queries

Not endpoint implementation.

---

# Owns Decision Documents

Every major architectural decision produces an ADR.

Examples

Repository IR v1

Ontology v2

Closure Algorithm

Capability Mapping

Requirement Normalization

Snapshot Strategy

Every ADR is approved here.

---

# Owns References

Studies

LLVM

Joern

Semgrep

CodeQL

Tree-sitter

OpenRewrite

OpenAPI

AsyncAPI

Schema.org

RDF

Compiler textbooks

Extracts reusable concepts.

Does not copy implementation.

---

# Owns Algorithm Design

Designs

Reachability

Incremental compilation

Capability discovery

Constraint propagation

Graph diff

Snapshot diff

Requirement normalization

Closure verification

The low reasoning AI later implements them.

---

# Owns AI Isolation

Determines

Where AI is allowed

Where AI is forbidden

Current rule

AI may only exist

Document Normalization (optional)

Semantic Projection

Everything else must be deterministic.

---

# Owns Versioning

Designs

IR versioning

Ontology versioning

Migration strategy

Snapshot compatibility

Compiler compatibility

---

# Owns Performance Strategy

Designs

Incremental rebuild

Caching

Parallel builders

Dependency invalidation

Snapshot reuse

Memory strategy

Low reasoning AI later implements.

---

# Owns Acceptance Criteria

Every feature begins with

Intent

Architecture

Interfaces

Acceptance Criteria

References

Tests

Only then implementation starts.

---

# Reviews All Pull Requests

The high reasoning AI never blindly writes code.

It reviews

Architecture

Naming

Correctness

Determinism

Ontology impact

IR compatibility

Performance implications

Future extensibility

Rejects architectural drift.

---

# Forbidden Tasks

The high reasoning AI should NOT

Implement CRUD

Write parser boilerplate

Write DTOs

Write repetitive tests

Generate API routes

Implement adapters

Implement storage

Implement repositories

Implement REST handlers

Generate fixtures

Generate snapshots

Write SQL migrations

Write repetitive graph algorithms already specified

Those belong to the low reasoning AI.

---

# Typical Good Tasks

Design Repository IR v2

Design Requirement IR

Design Capability Ontology

Design Closure Engine

Design Coverage Algorithm

Review Builder Contracts

Review Compiler Pipeline

Review Graph Schema

Review Incremental Compilation

Design Snapshot Model

Design Requirement Normalizer

Determine Capability Discovery Rules

Design Execution Chain Model

Create ADRs

Review PRs for semantic correctness

---

# Typical Bad Tasks

Implement SQLite repository

Write Fastify routes

Generate Tree-sitter adapter

Write Markdown parser

Implement DFS

Implement Graph Serializer

Generate Unit Tests

Write OpenAPI parser

Create Dockerfile

These waste high reasoning capacity.

---

# Review Checklist

Every architectural proposal must answer

Does it preserve determinism?

Does it preserve Repository IR compatibility?

Does it require AI?

Can it be implemented by a deterministic builder?

Will it scale across languages?

Does it increase ontology complexity?

Does it introduce ambiguity?

Can it be versioned?

Can it be tested?

Can it be explained?

---

# Interaction Model

The high reasoning AI should rarely generate code.

Instead it should produce

Architecture diagrams

IR schemas

Builder contracts

Decision records

Algorithms

Acceptance criteria

Test specifications

Reference mappings

Review comments

Implementation plans

These become input for the low reasoning AI.

---

# Success Metric

The high reasoning AI succeeds when the low reasoning AI can implement an entire subsystem without asking architectural questions.

Its output should remove ambiguity rather than produce code.

Every major decision should reduce future reasoning requirements, increase determinism, and preserve the integrity of the Repository Intermediate Representation.

The high reasoning AI functions as the chief compiler architect whose responsibility is not implementation speed, but maintaining a coherent, extensible, and deterministic software knowledge compiler over the lifetime of the project.
