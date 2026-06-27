# TSPEC-I004 — SQLite storage repository (Work Order)

> Authored by ROLE_ARCHITECT during `ARCHITECTURE_REVIEW`. Implement using ONLY this
> document. Make no architectural decisions; if anything is ambiguous, STOP and escalate.

- **TSPEC:** TSPEC-I004 · **Owner:** ROLE_IMPLEMENTER · **Header:** `eos/tspecs/TSPEC-I004.yaml`
- **Depends on:** TSPEC-A012 (storage schema), TSPEC-I001 (common) — both COMPLETE · **Wave:** 3

## 1. Objective

Provide a durable `Storage` implementation backed by SQLite that losslessly persists
and retrieves `SnapshotIR` and `RequirementSet`, behind the existing `Storage` interface,
with deterministic ordering identical to `InMemoryStorage`.

## 2. Contract (fixed — do not change)

Implement this interface exactly as already defined in `packages/storage/src/index.ts`:

```ts
export interface Storage {
  saveSnapshot(snapshot: SnapshotIR): Promise<void>;
  loadSnapshot(id: string): Promise<SnapshotIR | undefined>;
  latestSnapshot(): Promise<SnapshotIR | undefined>;
  listSnapshots(): Promise<readonly SnapshotIR[]>;
  saveRequirements(set: RequirementSet): Promise<void>;
  loadRequirements(): Promise<RequirementSet | undefined>;
}
```

The DDL is fixed and already exported as `SQLITE_SCHEMA` from the same file. Apply it
verbatim on construction. `SnapshotIR`, `RepositoryIR`, `RequirementSet`, and
`REQUIREMENT_IR_VERSION` are imported from `@rir/ir`.

## 3. Files

| Action | Path | Purpose |
| --- | --- | --- |
| create | `packages/storage/src/sqlite.ts` | `SqliteStorage` implementation |
| modify | `packages/storage/src/index.ts` | add `export { SqliteStorage } from "./sqlite.js";` |
| modify | `packages/storage/package.json` | add dependency `better-sqlite3`; devDep `@types/better-sqlite3` |
| create | `tests/integration/storage-sqlite.test.ts` | the tests from §7 |

## 4. Behavior / Algorithm

1. **Constructor** `new SqliteStorage(dbPath: string)`: open a `better-sqlite3` database
   at `dbPath` (use `":memory:"` for ephemeral). Run `db.pragma("journal_mode = WAL")`
   then `db.exec(SQLITE_SCHEMA)`. Prepare statements once and reuse them.
2. **saveSnapshot(s)**: `INSERT OR REPLACE INTO snapshots (id, created_at, repository_hash, data)`
   with `data = JSON.stringify(s)`. Single statement; no transaction needed.
3. **loadSnapshot(id)**: `SELECT data FROM snapshots WHERE id = ?`. If no row → `undefined`;
   else `JSON.parse(row.data) as SnapshotIR`.
4. **latestSnapshot()**: `SELECT data FROM snapshots ORDER BY rowid DESC LIMIT 1`.
   `rowid` reflects insertion order, matching `InMemoryStorage`. None → `undefined`.
5. **listSnapshots()**: `SELECT data FROM snapshots ORDER BY rowid ASC`; map+parse.
6. **saveRequirements(set)**: in ONE transaction — `DELETE FROM requirements;` then for
   each requirement `INSERT INTO requirements (id, feature, capability, priority, data)`
   with `data = JSON.stringify(req)`. (The set is replaced wholesale, not merged.)
7. **loadRequirements()**: `SELECT data FROM requirements ORDER BY rowid ASC`. If zero
   rows → `undefined`. Otherwise return
   `{ version: REQUIREMENT_IR_VERSION, requirements: rows.map(r => JSON.parse(r.data)) }`.
8. All methods are `async` to satisfy the interface even though better-sqlite3 is sync;
   simply `return`/`return Promise.resolve(...)`. No other public methods.

> Out of scope (do NOT do here): decomposing nodes/edges/capabilities into their own
> tables. The `snapshots.data` JSON is the source of truth for load. Per-entity indexing
> is a separate future TSPEC. Leaving those tables empty is correct for I004.

## 5. Input → Output examples (golden)

Given `SnapshotIR` `S = { id: "snap|1", createdAt: "2026-06-27T00:00:00Z",
repositoryHash: "abc", ir: emptyRepositoryIR() }`:

- `await store.saveSnapshot(S); await store.loadSnapshot("snap|1")` → deep-equals `S`.
- After saving `S1` then `S2`, `latestSnapshot()` → `S2`; `listSnapshots()` → `[S1, S2]`.
- `loadSnapshot("missing")` → `undefined`.
- `loadRequirements()` before any save → `undefined`.
- `saveRequirements(emptyRequirementSet())` then `loadRequirements()` → `undefined`
  (empty set persists zero rows).

## 6. Edge cases

- Re-saving a snapshot with an existing `id` replaces it (INSERT OR REPLACE), not duplicate.
- Re-opening a `SqliteStorage` on the same on-disk `dbPath` sees previously saved data.
- `:memory:` databases are isolated per instance.
- `saveRequirements` called twice: the second call fully replaces the first.

## 7. Acceptance criteria (concrete — each is a test)

1. `SqliteStorage` is assignable to `Storage` (type-level; no `as` casts in tests).
2. snapshot round-trip: save → `loadSnapshot` returns a value deep-equal to the input.
3. `latestSnapshot` returns the most recently saved snapshot.
4. `listSnapshots` returns all snapshots in insertion order.
5. `loadSnapshot` of an unknown id returns `undefined`.
6. requirements round-trip via `saveRequirements`/`loadRequirements`.
7. durability: a second `SqliteStorage` opened on the same temp file path reads data
   written by the first.
8. coverage for `packages/storage/src/sqlite.ts` ≥ 95%.

## 8. Forbidden changes

- Do NOT modify the `Storage` interface or `SQLITE_SCHEMA` (architect-owned, TSPEC-A012).
- Do NOT change `InMemoryStorage`.
- Do NOT add public methods beyond the interface.
- Do NOT touch any package other than `storage` (and its `package.json`).

## 9. References

- better-sqlite3 API: https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md
- SQLite `INSERT OR REPLACE`: https://www.sqlite.org/lang_insert.html
- SQLite `rowid`: https://www.sqlite.org/rowidtable.html
- WAL mode: https://www.sqlite.org/wal.html

## 10. Definition of done

`pnpm build` · `pnpm typecheck` · `pnpm lint` · the 8 tests in §7 green · coverage ≥ 95%
· all CI gates in `eos/policy/ci-gates.md` green · PR follows `feat(tspec-i004): …`.
