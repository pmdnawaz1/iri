/**
 * @rir/storage — Storage abstraction.
 *
 * Defines the persistence contract and the canonical SQLite schema. Initially the
 * IR persists to SQLite (tables below); the in-memory implementation here keeps the
 * build self-contained and serves tests/the CLI until the SQLite repository (a
 * low-reasoning implementation task) lands behind the same interface.
 */

import type { RepositoryIR, RequirementSet, SnapshotIR } from "@rir/ir";

/** Persistence contract for compiled IR and snapshots. */
export interface Storage {
  saveSnapshot(snapshot: SnapshotIR): Promise<void>;
  loadSnapshot(id: string): Promise<SnapshotIR | undefined>;
  latestSnapshot(): Promise<SnapshotIR | undefined>;
  listSnapshots(): Promise<readonly SnapshotIR[]>;
  saveRequirements(set: RequirementSet): Promise<void>;
  loadRequirements(): Promise<RequirementSet | undefined>;
}

/**
 * Canonical SQLite schema (single source for the future SQLite implementation).
 * No ORM. Tables mirror the IR aggregate; `data` columns hold canonical JSON.
 */
export const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS artifacts (
  id        TEXT PRIMARY KEY,
  kind      TEXT NOT NULL,
  path      TEXT NOT NULL,
  language  TEXT,
  hash      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS nodes (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL,
  name        TEXT NOT NULL,
  artifact_id TEXT NOT NULL REFERENCES artifacts(id),
  hash        TEXT NOT NULL,
  data        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_nodes_kind ON nodes(kind);
CREATE INDEX IF NOT EXISTS idx_nodes_artifact ON nodes(artifact_id);

CREATE TABLE IF NOT EXISTS edges (
  id     TEXT PRIMARY KEY,
  kind   TEXT NOT NULL,
  src    TEXT NOT NULL REFERENCES nodes(id),
  dst    TEXT NOT NULL REFERENCES nodes(id),
  data   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_edges_src ON edges(src);
CREATE INDEX IF NOT EXISTS idx_edges_dst ON edges(dst);
CREATE INDEX IF NOT EXISTS idx_edges_kind ON edges(kind);

CREATE TABLE IF NOT EXISTS capabilities (
  id         TEXT PRIMARY KEY,
  feature    TEXT NOT NULL,
  capability TEXT NOT NULL,
  closure    TEXT NOT NULL,
  data       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS constraints (
  capability_id TEXT NOT NULL REFERENCES capabilities(id),
  key           TEXT NOT NULL,
  value         TEXT NOT NULL,
  PRIMARY KEY (capability_id, key)
);

CREATE TABLE IF NOT EXISTS evidence (
  owner_id  TEXT NOT NULL,
  source    TEXT NOT NULL,
  locator   TEXT NOT NULL,
  confidence REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_evidence_owner ON evidence(owner_id);

CREATE TABLE IF NOT EXISTS snapshots (
  id              TEXT PRIMARY KEY,
  created_at      TEXT NOT NULL,
  repository_hash TEXT NOT NULL,
  data            TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS requirements (
  id         TEXT PRIMARY KEY,
  feature    TEXT NOT NULL,
  capability TEXT NOT NULL,
  priority   TEXT NOT NULL,
  data       TEXT NOT NULL
);
`;

/** Deterministic, in-process Storage implementation (no external dependency). */
export class InMemoryStorage implements Storage {
  private readonly snapshots = new Map<string, SnapshotIR>();
  private order: string[] = [];
  private requirements: RequirementSet | undefined;

  async saveSnapshot(snapshot: SnapshotIR): Promise<void> {
    if (!this.snapshots.has(snapshot.id)) this.order.push(snapshot.id);
    this.snapshots.set(snapshot.id, snapshot);
  }

  async loadSnapshot(id: string): Promise<SnapshotIR | undefined> {
    return this.snapshots.get(id);
  }

  async latestSnapshot(): Promise<SnapshotIR | undefined> {
    const last = this.order.at(-1);
    return last ? this.snapshots.get(last) : undefined;
  }

  async listSnapshots(): Promise<readonly SnapshotIR[]> {
    return this.order.map((id) => this.snapshots.get(id)!);
  }

  async saveRequirements(set: RequirementSet): Promise<void> {
    this.requirements = set;
  }

  async loadRequirements(): Promise<RequirementSet | undefined> {
    return this.requirements;
  }
}

/** Convenience accessor used by callers that just need the current IR. */
export function snapshotIR(snapshot: SnapshotIR | undefined): RepositoryIR | undefined {
  return snapshot?.ir;
}

export { SqliteStorage } from "./sqlite.js";
