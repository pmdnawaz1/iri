# ADR-0012 — Storage Schema

Status: Accepted · Owner: ROLE_ARCHITECT · TSPEC: TSPEC-A012

## Context
The IR must persist durably with a stable, ORM-free schema.

## Decision
`@rir/storage` defines the `Storage` interface and the canonical `SQLITE_SCHEMA`
(artifacts, nodes, edges, capabilities, constraints, evidence, snapshots, requirements).
`snapshots.data` (canonical JSON) is the source of truth for load; per-entity tables are
for future query indexing. `InMemoryStorage` is the reference implementation.

## Invariants
1. The schema and `Storage` interface are architect-owned (see TSPEC-I004 work order).
2. Initially SQLite; the interface abstracts Postgres/Neo4j later.
3. Snapshots are content-addressed and immutable.

## Consequences
The SQLite implementation (TSPEC-I004) persists snapshot JSON; node/edge decomposition
is a separate indexing TSPEC.
