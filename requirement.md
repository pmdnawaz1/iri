# Repository Intermediate Representation (RIR)

## A Compiler for Software Knowledge

---

# Vision

Software today is represented in many disconnected forms:

* Source code
* Business Requirement Documents (BRD)
* Technical Design Documents (TDD)
* API Specifications
* Database Schemas
* Architecture Documents
* Tests
* Runtime Information
* Git History

Existing tools treat each artifact independently.

Examples:

* CodeGraph builds call graphs.
* AST parsers understand syntax.
* Documentation tools understand text.
* Embedding-based systems perform semantic retrieval.

None of them answer the fundamental question:

> **Is the software capability completely implemented, correctly connected, documented, and verifiably executable from end to end?**

This project introduces a compiler architecture that compiles every software artifact into one canonical Intermediate Representation (Repository IR / RIR).

The Repository IR becomes the single source of truth.

Natural language is never stored as truth.

Only canonical facts are stored.

Every explanation is generated on demand from the IR.

---

# Core Intent

Build a deterministic Software Knowledge Compiler that compiles every software artifact into a common Intermediate Representation where software is represented as connected capabilities instead of isolated files.

The compiler must verify:

* Completeness
* Reachability
* Coverage
* Consistency
* Documentation correctness
* Execution closure

without depending on AI after compilation.

---

# Philosophy

Never compare:

Document ↔ Code

Always compare:

Document Compiler
↓

Requirement IR

↓

Repository IR

↑

Code Compiler

↓

Source Code

Both documentation and source code compile into the same Intermediate Representation.

---

# Primary Goal

Move software understanding from:

Text

↓

LLM

↓

Guess

to

Software Artifacts

↓

Compiler

↓

Repository IR

↓

Graph Algorithms

↓

Deterministic Analysis

↓

LLM (optional)

---

# Repository Intermediate Representation (RIR)

The Repository IR stores only canonical facts.

Example node:

Identity

* id
* language
* file
* span
* hash

Relations

* imports
* exports
* calls
* calledBy
* implements
* inherits
* dependsOn
* renders
* emits
* consumes

Execution

* reachable
* entryDistance
* runtimeObserved
* tested

Evidence

* AST
* Runtime
* Tests
* Documentation
* Git

Capabilities

* Feature
* Capability
* Constraints

Closure

* CLOSED
* PARTIAL
* BROKEN
* ORPHAN
* CONFLICTING

---

# Requirement Intermediate Representation (Requirement IR)

Business documents are normalized into facts.

Not prose.

Example:

Feature

AUTH

Capability

LOGIN

Constraints

LOGIN_IDENTIFIER = EMAIL

OTP_REQUIRED = TRUE

OTP_CHANNEL = EMAIL

OTP_EXPIRY = 300

Outputs

JWT

Priority

MUST

---

# Why Requirement IR?

Instead of comparing English to code:

"OTP should be sent via email."

↓

Compiler

↓

OTP_CHANNEL = EMAIL

Later

"OTP should be sent via SMS."

↓

Compiler

↓

OTP_CHANNEL = SMS

↓

Conflict

No AI required after compilation.

---

# Capability Ontology

Every project maps into a canonical capability ontology.

Example:

AUTH

* LOGIN
* REGISTER
* LOGOUT
* VERIFY_EMAIL
* VERIFY_OTP
* RESET_PASSWORD
* REFRESH_TOKEN

PAYMENT

* CREATE_PAYMENT
* CAPTURE
* REFUND
* CANCEL

ORDER

* CREATE
* UPDATE
* CANCEL

PROFILE

NOTIFICATION

CHECKOUT

CART

INVENTORY

etc.

Every capability contains deterministic properties.

---

# Compiler Architecture

Repository

↓

Language Frontend

↓

Canonical Facts

↓

Builder Passes

↓

Repository IR

↓

Closure Engine

↓

Consistency Engine

↓

Coverage Engine

↓

Semantic Projection (optional)

---

# Language Frontend

Responsible only for parsing.

Produces:

AST

Symbols

Imports

Exports

Declarations

Types

Nothing semantic.

---

# Builder Passes

Every builder owns one responsibility.

ImportBuilder

CallBuilder

RouteBuilder

TypeBuilder

ComponentBuilder

SQLBuilder

EventBuilder

ReachabilityBuilder

DependencyBuilder

CapabilityBuilder

ConstraintBuilder

OwnershipBuilder

FlowBuilder

No builder overlaps responsibilities.

---

# Execution Closure

The key innovation.

Every capability must form a complete execution path.

Example

AUTH.LOGIN

↓

Frontend Route

↓

Component

↓

Button

↓

Handler

↓

API Call

↓

Backend Route

↓

Controller

↓

Service

↓

Repository

↓

Database

↓

Response

↓

Frontend State

↓

Rendered UI

↓

Capability CLOSED

Any missing edge produces deterministic failures.

Examples:

* Dangling backend routes
* Unused frontend
* Missing database writes
* Missing event consumer
* Broken API chain
* Missing documentation
* Undocumented implementation

---

# Closure States

CLOSED

Complete end-to-end execution.

PARTIAL

Some implementation exists.

BROKEN

Execution path interrupted.

ORPHAN

No incoming path.

UNREACHABLE

Cannot be reached from entrypoints.

CONFLICTING

Contradicting requirements.

---

# Reachability

Repository entrypoints include:

Backend

* HTTP Routes
* Workers
* Queues
* Cron
* CLI
* Lambdas

Frontend

* Router
* Main Entry
* Layouts
* Navigation
* Dynamic Imports

Graph traversal computes:

reachable

entryDistance

orphan nodes

dead code

unused UI

---

# Evidence System

Every relation stores evidence.

Examples

AST

Runtime

Tests

Documentation

Git

Confidence

Nothing is inferred without provenance.

---

# Consistency Engine

Performs graph validation.

Detects:

Requirement conflicts

Implementation conflicts

Missing implementations

Broken execution chains

Undocumented capabilities

Overimplemented features

Route mismatches

Constraint mismatches

---

# Coverage Engine

Computes:

Requirement Coverage

Implementation Coverage

Documentation Coverage

Frontend Coverage

Backend Coverage

Database Coverage

Test Coverage

Capability Coverage

---

# Semantic Projection Layer

AI is only used here.

Repository IR

↓

Capability Subgraph

↓

LLM

↓

Explanation

LLM never writes into Repository IR.

All summaries are disposable.

---

# Query Engine

Instead of vector search:

Locate capability

↓

Expand graph

↓

Collect connected nodes

↓

Provide Repository IR

↓

LLM

Example queries

How does login work?

Why is checkout broken?

What changed after commit X?

Which APIs are undocumented?

Which capabilities are incomplete?

---

# Repository Artifacts

Code

↓

Code Compiler

Documentation

↓

Document Compiler

API Specs

↓

API Compiler

Database

↓

Schema Compiler

Tests

↓

Test Compiler

Runtime

↓

Telemetry Compiler

Everything targets Repository IR.

---

# Technology Stack

## Parsing

Tree-sitter

Purpose

AST generation

Reuse completely.

---

## Structural Matching

ast-grep

Purpose

Pattern matching over AST.

Reuse completely.

---

## Property Graph Concepts

Joern Code Property Graph

Reuse concepts:

AST

CFG

Data Flow

Do not reuse vulnerability engine.

---

## Static Analysis Concepts

Semgrep

CodeQL

Reuse rule concepts.

---

## API Parsing

OpenAPI

AsyncAPI

Reuse completely.

---

## Schema Parsing

JSON Schema

Reuse constraints.

---

## Markdown Parsing

Use existing Markdown parsers.

Only extract structure.

Do not interpret semantics.

---

## Compiler Architecture Inspiration

LLVM

Reuse:

Pass architecture

Intermediate Representation philosophy

Builder pipeline

---

## Ontology Inspiration

RDF Triple Model

Subject

Predicate

Object

Use only as inspiration.

Do not expose RDF internally.

---

## Vocabulary Design

Schema.org

Use as inspiration for ontology evolution.

---

## Graph Storage

Initially

SQLite

Tables

nodes

edges

evidence

capabilities

constraints

artifacts

Later

Neo4j

or

Custom graph storage

---

# Components To Build

Code Compiler

Document Compiler

Repository IR

Requirement IR

Capability Ontology

Builder Framework

Reachability Engine

Closure Engine

Consistency Engine

Coverage Engine

Graph Query Engine

Semantic Projection Layer

---

# Existing Work Reused

Tree-sitter

AST parsing

ast-grep

Structural matching

Joern

Property graph concepts

Semgrep

Rule concepts

CodeQL

Static analysis concepts

LLVM

Compiler architecture

OpenAPI

API ontology

AsyncAPI

Event ontology

JSON Schema

Validation constraints

Markdown Parser

Document parsing

---

# Original Contributions

Repository Intermediate Representation (RIR)

Requirement Intermediate Representation

Capability Ontology

Execution Closure Engine

Capability Coverage Engine

Consistency Engine

Repository-level Compiler

Cross-artifact Graph

Capability-first software representation

Deterministic document ↔ code comparison

End-to-end capability verification

---

# Long-term Vision

The system becomes the LLVM of software repositories.

Programming languages compile into LLVM IR.

Software artifacts compile into Repository IR.

Repository IR becomes the canonical representation that any AI, static analyzer, documentation engine, IDE, CI pipeline, or automation tool can consume without depending on natural-language interpretation.

The objective is not to understand source code.

The objective is to compile software knowledge into a deterministic representation capable of proving software completeness, consistency, and execution closure across every artifact in a repository.
