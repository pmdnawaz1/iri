# Work Allocation for Low-Reasoning AI

## (Mimo v2.5 / Qwen / DeepSeek Lite / GPT-4.1 Mini / etc.)

---

# Philosophy

Low reasoning models should **never make architectural decisions.**

They should behave like extremely productive junior compiler engineers.

Their job is:

* deterministic implementation
* repetitive coding
* boilerplate generation
* adapters
* tests
* plumbing
* validation
* documentation synchronization

They should never invent ontology.

They should never modify IR schemas.

They should never redesign compiler passes.

---

# Responsibilities

The low reasoning AI is responsible for approximately **80% of repository implementation**.

It receives:

* precise specification
* architecture
* interface
* expected input/output
* references

and produces production-quality implementation.

---

# Allowed Tasks

## 1. Repository Setup

Create

* package structure
* pnpm workspace
* tsconfig
* eslint
* prettier
* vitest
* docker
* github actions

No architecture decisions.

---

## 2. Dependency Installation

Install

Tree-sitter

Fastify

Vitest

Kysely

SQLite

Pino

Zod

Remark

Graphology

etc.

---

## 3. API Boilerplate

Generate

```text
POST /compile/code

POST /compile/document

POST /closure

POST /query

POST /coverage

POST /diff
```

Only route wiring.

No implementation decisions.

---

## 4. DTOs

Generate

```ts
CompileRepositoryRequest

CompileRepositoryResponse

NodeIR

EdgeIR

CapabilityIR

EvidenceIR
```

Pure schema implementation.

---

## 5. Tree-sitter Adapters

Implement language adapters.

Example

```ts
parse()

symbols()

imports()

exports()

types()

functions()

classes()

variables()
```

No semantic interpretation.

---

## 6. Markdown Parsing

Implement

Markdown AST extraction

Heading extraction

Tables

Lists

Code blocks

Images

Mermaid detection

PlantUML detection

Nothing semantic.

---

## 7. Builder Skeletons

Generate empty builders.

Example

```ts
CallBuilder

ImportBuilder

RouteBuilder

ReachabilityBuilder

SQLBuilder
```

Only class structure.

No algorithms.

---

## 8. Graph Models

Implement

```ts
Node

Edge

Artifact

Evidence

Capability
```

No new properties.

Only architecture-approved schemas.

---

## 9. Storage Layer

Implement

SQLite

CRUD

Migrations

Repositories

Transactions

Indexes

Nothing more.

---

## 10. Graph Algorithms

Implement existing algorithms.

Examples

DFS

BFS

Topological Sort

Cycle Detection

Strongly Connected Components

Shortest Path

No modifications.

---

## 11. Parsers

Implement

OpenAPI parser

AsyncAPI parser

JSON Schema parser

Markdown parser

Tree-sitter wrappers

No interpretation.

---

## 12. Compiler Pass Framework

Generate

```ts
interface Builder

interface Pass

PassRunner

PluginRegistry
```

No execution logic.

---

## 13. Tests

Generate

Unit Tests

Integration Tests

Golden Tests

Snapshot Tests

Performance Tests

Property Tests

Regression Tests

---

## 14. Golden Fixtures

Generate repositories.

Examples

Express

NestJS

React

Vue

Broken Repository

Spring

Go

Tiny examples.

---

## 15. Benchmarks

Generate

Benchmark suites

Compile time

Memory

Graph size

Traversal

---

## 16. Documentation

Generate

API docs

Swagger

JSDoc

README synchronization

---

# Forbidden Tasks

The low reasoning AI MUST NEVER

---

## Change Repository IR

Forbidden

---

## Change Requirement IR

Forbidden

---

## Modify Ontology

Forbidden

---

## Rename Capabilities

Forbidden

---

## Introduce New Capability

Forbidden

---

## Change Compiler Pipeline

Forbidden

---

## Modify Builder Order

Forbidden

---

## Create New Builder

Forbidden

Unless explicitly requested.

---

## Change Execution Closure Rules

Forbidden

---

## Interpret Business Requirements

Forbidden

---

## Perform Semantic Matching

Forbidden

---

## Decide Property Names

Forbidden

---

## Infer Constraints

Forbidden

---

## Change Graph Relationships

Forbidden

---

## Design Algorithms

Forbidden

---

# Inputs Expected

Every task should contain

Goal

Reference

Interfaces

Expected Input

Expected Output

Tests

Acceptance Criteria

The low reasoning model should never invent missing requirements.

---

# Output Quality

Every generated code must

Compile

Pass lint

Pass tests

Pass type checking

Have no TODOs

Have no placeholder code

Be deterministic

---

# Testing Responsibility

Every implementation must include

Unit tests

Integration tests

Failure tests

Edge cases

Performance tests (where applicable)

Golden tests (compiler outputs)

Coverage target

95%+

---

# Validation Checklist

Before marking a task complete

✓ Builds successfully

✓ Tests pass

✓ No type errors

✓ No lint errors

✓ API contract matches

✓ Golden tests updated

✓ No architecture changes

---

# Prompt Style

Always provide

Architecture

↓

Task

↓

Constraints

↓

Acceptance Criteria

↓

References

↓

Generate

Never ask

"Design this"

Ask

"Implement this"

---

# Typical Good Tasks

Implement Tree-sitter TypeScript adapter.

Implement Markdown AST extractor.

Implement SQLite repository.

Implement Reachability DFS.

Implement SCC algorithm.

Implement Graph Serializer.

Implement Builder Registry.

Implement OpenAPI parser.

Implement Graph API endpoint.

Implement compiler snapshot loader.

---

# Typical Bad Tasks

Design Repository IR.

Invent ontology.

Determine capability hierarchy.

Decide execution closure rules.

Interpret documentation.

Create semantic mapping.

Determine capability ownership.

Create graph relationships.

These always require the high reasoning AI.

---

# Success Metric

The low reasoning AI should function like a deterministic compiler engineer.

It should maximize implementation throughput while minimizing architectural drift.

If every architectural decision has already been made, the low reasoning AI should be capable of producing approximately **80% of the codebase**, including infrastructure, adapters, parsers, APIs, tests, storage, and compiler framework, without requiring additional reasoning.
