import { describe, it, expect, afterEach } from "vitest";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { SqliteStorage } from "@rir/storage";
import type { Storage } from "@rir/storage";
import { emptyRepositoryIR, emptyRequirementSet } from "@rir/ir";
import type { SnapshotIR, RequirementSet } from "@rir/ir";

let tempDir: string;
const stores: SqliteStorage[] = [];

function makeSnapshot(id: string): SnapshotIR {
  return {
    id,
    createdAt: "2026-06-27T00:00:00Z",
    repositoryHash: "abc",
    ir: emptyRepositoryIR(),
  };
}

function createStore(dbName = "test.db"): SqliteStorage {
  const store = new SqliteStorage(join(tempDir, dbName));
  stores.push(store);
  return store;
}

afterEach(() => {
  for (const s of stores) s.close();
  stores.length = 0;
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
});

describe("SqliteStorage", () => {
  it("is assignable to Storage", () => {
    tempDir = mkdtempSync(join(tmpdir(), "rir-test-"));
    const store: Storage = createStore();
    expect(store).toBeDefined();
  });

  it("snapshot round-trip", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "rir-test-"));
    const store = createStore();
    const s = makeSnapshot("snap|1");
    await store.saveSnapshot(s);
    const loaded = await store.loadSnapshot("snap|1");
    expect(loaded).toEqual(s);
  });

  it("latestSnapshot returns most recent", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "rir-test-"));
    const store = createStore();
    const s1 = makeSnapshot("snap|1");
    const s2 = makeSnapshot("snap|2");
    await store.saveSnapshot(s1);
    await store.saveSnapshot(s2);
    expect(await store.latestSnapshot()).toEqual(s2);
  });

  it("listSnapshots returns insertion order", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "rir-test-"));
    const store = createStore();
    const s1 = makeSnapshot("snap|1");
    const s2 = makeSnapshot("snap|2");
    await store.saveSnapshot(s1);
    await store.saveSnapshot(s2);
    expect(await store.listSnapshots()).toEqual([s1, s2]);
  });

  it("loadSnapshot unknown id returns undefined", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "rir-test-"));
    const store = createStore();
    expect(await store.loadSnapshot("missing")).toBeUndefined();
  });

  it("requirements round-trip", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "rir-test-"));
    const store = createStore();
    const reqSet: RequirementSet = {
      version: "1.0.0",
      requirements: [{
        id: "req|1",
        feature: "AUTH",
        capability: "AUTH.LOGIN",
        constraints: [],
        outputs: [],
        priority: "MUST",
        evidence: [{ source: "AST", locator: "test", confidence: 1 }],
      }],
    };
    await store.saveRequirements(reqSet);
    const loaded = await store.loadRequirements();
    expect(loaded).toEqual(reqSet);
  });

  it("durability: second instance reads data", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "rir-test-"));
    const dbPath = join(tempDir, "test.db");
    const s = makeSnapshot("snap|1");
    const store1 = createStore();
    await store1.saveSnapshot(s);
    const store2 = createStore();
    expect(await store2.loadSnapshot("snap|1")).toEqual(s);
  });

  it("empty requirements returns undefined", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "rir-test-"));
    const store = createStore();
    expect(await store.loadRequirements()).toBeUndefined();
  });
});
