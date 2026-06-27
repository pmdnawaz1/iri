import Database from "better-sqlite3";
import { type Storage, SQLITE_SCHEMA } from "./index.js";
import type { RequirementSet, SnapshotIR } from "@rir/ir";
import { REQUIREMENT_IR_VERSION } from "@rir/ir";

export class SqliteStorage implements Storage {
  private readonly db: Database.Database;
  private readonly insertSnapshot: Database.Statement;
  private readonly selectSnapshotById: Database.Statement;
  private readonly selectLatestSnapshot: Database.Statement;
  private readonly selectAllSnapshots: Database.Statement;
  private readonly deleteRequirements: Database.Statement;
  private readonly insertRequirement: Database.Statement;
  private readonly selectAllRequirements: Database.Statement;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(SQLITE_SCHEMA);

    this.insertSnapshot = this.db.prepare(
      "INSERT OR REPLACE INTO snapshots (id, created_at, repository_hash, data) VALUES (?, ?, ?, ?)"
    );
    this.selectSnapshotById = this.db.prepare("SELECT data FROM snapshots WHERE id = ?");
    this.selectLatestSnapshot = this.db.prepare("SELECT data FROM snapshots ORDER BY rowid DESC LIMIT 1");
    this.selectAllSnapshots = this.db.prepare("SELECT data FROM snapshots ORDER BY rowid ASC");
    this.deleteRequirements = this.db.prepare("DELETE FROM requirements");
    this.insertRequirement = this.db.prepare(
      "INSERT INTO requirements (id, feature, capability, priority, data) VALUES (?, ?, ?, ?, ?)"
    );
    this.selectAllRequirements = this.db.prepare("SELECT data FROM requirements ORDER BY rowid ASC");
  }

  async saveSnapshot(snapshot: SnapshotIR): Promise<void> {
    this.insertSnapshot.run(snapshot.id, snapshot.createdAt, snapshot.repositoryHash, JSON.stringify(snapshot));
  }

  async loadSnapshot(id: string): Promise<SnapshotIR | undefined> {
    const row = this.selectSnapshotById.get(id) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as SnapshotIR) : undefined;
  }

  async latestSnapshot(): Promise<SnapshotIR | undefined> {
    const row = this.selectLatestSnapshot.get() as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as SnapshotIR) : undefined;
  }

  async listSnapshots(): Promise<readonly SnapshotIR[]> {
    const rows = this.selectAllSnapshots.all() as { data: string }[];
    return rows.map(r => JSON.parse(r.data) as SnapshotIR);
  }

  async saveRequirements(set: RequirementSet): Promise<void> {
    const insertMany = this.db.transaction(() => {
      this.deleteRequirements.run();
      for (const req of set.requirements) {
        this.insertRequirement.run(req.id, req.feature, req.capability, req.priority, JSON.stringify(req));
      }
    });
    insertMany();
  }

  async loadRequirements(): Promise<RequirementSet | undefined> {
    const rows = this.selectAllRequirements.all() as { data: string }[];
    if (rows.length === 0) return undefined;
    return {
      version: REQUIREMENT_IR_VERSION,
      requirements: rows.map(r => JSON.parse(r.data)),
    };
  }

  close(): void {
    this.db.close();
  }
}
