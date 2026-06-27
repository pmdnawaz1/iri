# Repository Structure

## Project Name

Repository Intermediate Representation (RIR)

Software Knowledge Compiler

---

# Philosophy

The repository itself should resemble a compiler.

Never organize by language.

Never organize by frontend/backend.

Organize by compiler stages.

```
repository/
│
├── apps/
├── packages/
├── tests/
├── fixtures/
├── references/
├── scripts/
├── docker/
└── docs/
```

---

# apps/

Contains executable applications.

```
apps/

compiler-api/
worker/
cli/
```

---

## compiler-api

REST API only.

Responsible for

* compile repository
* compile document
* diff
* query
* closure validation

Nothing else.

---

## worker

Background jobs

Examples

```
Compile Repository

Compile Documents

Rebuild Graph

Ontology Update

Snapshot Generation

Git History Analysis
```

---

## cli

Developer CLI

```
rir compile

rir diff

rir query

rir graph

rir validate

rir snapshot
```

---

# packages/

Entire business logic.

Every package should be independently testable.

```
packages/

core/

graph/

ir/

ontology/

code-compiler/

document-compiler/

builder-engine/

passes/

closure/

coverage/

consistency/

query-engine/

semantic/

storage/

telemetry/

common/
```

---

# packages/core

Contains

Compiler interfaces

Common types

Pipeline

Dependency Injection

Plugin Registry

Nothing domain specific.

---

# packages/ir

Canonical Intermediate Representation.

```
nodes/

edges/

artifacts/

capabilities/

constraints/

evidence/

snapshots/

serializer/

validator/
```

No parser logic.

Only schemas.

---

# packages/ontology

Probably the most important package.

```
ontology/

capabilities/

properties/

relationships/

constraints/

enums/

aliases/

validators/
```

Example

```
AUTH/

LOGIN/

REGISTER/

RESET_PASSWORD/

VERIFY_EMAIL/
```

Each capability has

```
properties

constraints

valid relationships

expected execution chain
```

---

# packages/code-compiler

Only responsible for code.

```
language/

tree-sitter/

typescript/

javascript/

python/

java/

go/

rust/

csharp/
```

Each language has adapter

```
parse()

symbols()

imports()

exports()

types()

calls()

routes()
```

Nothing semantic.

---

# packages/document-compiler

Responsible for

Markdown

Docx

PDF

OpenAPI

AsyncAPI

JSON Schema

Mermaid

PlantUML

Every document compiles into Requirement IR.

```
markdown/

pdf/

docx/

tables/

statement-extractor/

requirement-normalizer/
```

---

# packages/builder-engine

Compiler pass runner.

```
Builder

↓

Pass

↓

Repository IR
```

Plugin architecture.

```
interface Builder

supports()

build()

priority()
```

---

# packages/passes

Every compiler pass.

One responsibility each.

```
ImportPass

CallPass

RoutePass

ReachabilityPass

ConstraintPass

CapabilityPass

OwnershipPass

FlowPass

DependencyPass

EventPass

SQLPass

ComponentPass

DocumentationPass

RuntimePass

GitPass
```

Each pass returns deterministic facts.

---

# packages/graph

Graph utilities.

```
Traversal

Shortest Path

Connected Components

Reachability

Topological Sort

Cycles

Strongly Connected Components
```

No compiler logic.

---

# packages/closure

Your innovation.

Responsible for

Execution Closure

```
Capability

↓

Expected Chain

↓

Actual Chain

↓

Closure Result
```

Outputs

```
CLOSED

PARTIAL

BROKEN

ORPHAN

UNREACHABLE

CONFLICTING
```

---

# packages/coverage

Produces

Requirement Coverage

Implementation Coverage

Documentation Coverage

Frontend Coverage

Backend Coverage

Test Coverage

Capability Coverage

---

# packages/consistency

Detects

Requirement conflicts

Route conflicts

Duplicate capabilities

Constraint violations

Broken references

Invalid ontology

---

# packages/query-engine

Responsible for

```
Capability Lookup

Subgraph Extraction

Dependency Expansion

Graph Filtering

Evidence Queries
```

No AI.

Only graph queries.

---

# packages/semantic

Only package allowed to call LLM.

Never writes to IR.

Only reads.

Produces

Summaries

Explanations

Reports

Reasoning Context

---

# packages/storage

Abstraction.

```
SQLite

Postgres

Neo4j

Filesystem
```

Initially

SQLite.

---

# packages/common

Utilities

Logger

Errors

Config

Cache

Metrics

Filesystem

Hashing

---

# packages/telemetry

Optional.

Runtime traces.

Execution logs.

Coverage imports.

OpenTelemetry ingestion.

---

# tests/

Never place tests beside source.

Everything centralized.

```
tests/

unit/

integration/

compiler/

ontology/

graph/

closure/

coverage/

api/

e2e/

performance/
```

---

## compiler/

Golden tests.

Input

Repository

↓

Expected IR

Compiler output must match.

These become the most important tests.

---

## ontology/

Every capability

Every property

Every alias

Every constraint

Must be tested.

---

## closure/

Every capability chain

Must verify

Closed

Broken

Partial

---

## graph/

Graph algorithms

Reachability

Cycles

Traversal

Distance

SCC

---

## performance/

Huge repositories

Linux

React

Angular

Node

Spring

Measure

Memory

Compile Time

Graph Size

---

# fixtures/

Tiny repositories.

```
express-auth/

nestjs/

react/

next/

vue/

java/

go/

microservices/

broken-repository/
```

Every compiler test uses fixtures.

---

# references/

Everything borrowed.

```
tree-sitter/

joern/

semgrep/

codeql/

llvm/

rdf/

schema-org/

openapi/

asyncapi/
```

Store notes.

Not source code.

---

# docs/

Architecture docs.

Compiler pipeline.

Ontology design.

Builder guide.

Plugin guide.

Repository IR specification.

Requirement IR specification.

---

# scripts/

Development scripts.

```
generate-ontology

benchmark

snapshot

compile-fixtures

generate-tests
```

---

# docker/

Development only.

```
SQLite

Postgres

Neo4j

Redis

API
```

---

# API Structure

```
POST

/compile/code

/compile/document

/compile/repository

/query

/diff

/closure

/coverage

/consistency

/graph

/snapshot

/ontology

/capabilities
```

---

# Database

Initially

SQLite

Tables

```
nodes

edges

artifacts

capabilities

constraints

evidence

snapshots

builder_results

ontology

queries
```

No ORM required initially.

---

# Recommended Tech Stack

Language

TypeScript

Runtime

Node.js

Package Manager

pnpm

Framework

Fastify

Validation

Zod

Parser

Tree-sitter

Pattern Matching

ast-grep

Database

SQLite

Query Builder

Kysely

Testing

Vitest

Integration Testing

Supertest

Property Testing

fast-check

Benchmarking

tinybench

Logging

Pino

Schema

JSON Schema

Documentation Parsing

remark ecosystem

Graph Algorithms

graphology (or custom implementation if performance demands it later)

---

# Repository Principles

1. Compiler-first architecture.

2. Every package independently testable.

3. No AI in compiler packages.

4. AI isolated to semantic package.

5. Every compiler pass deterministic.

6. Every builder idempotent.

7. Golden tests for every compiler output.

8. Repository IR is the only source of truth.

9. Plugins instead of language-specific hacks.

10. Optimize for correctness first, performance second.
