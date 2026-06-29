# RIR vs CodeGraph: Comparison for RIR Improvement

> Perspective: What can RIR steal, fix, and learn from CodeGraph's design.

---

## 1. RIR Strengths (Keep These)

| Strength | RIR Implementation | CodeGraph Equivalent | Notes |
|---|---|---|---|
| **Capability modeling** | `capabilities[]` with id, feature, closure state | None | Core differentiator. No graph DB does this. |
| **Closure analysis** | `closure[]` with expected/present/missing | None | Can answer "what's broken?" — CG can only answer "what exists?" |
| **Execution reachability** | `node.execution.reachable` | None | Only 13/3369 nodes reachable — but it's tracked. |
| **Route-first design** | `routes[]` + `mappedCapabilities[]` | 314 `route` nodes, no analysis | RIR treats routes as entry points. CG treats them as just another node kind. |
| **Diff/drift detection** | `rir diff` CLI | None | CI-gateable. CG has no versioning. |
| **Dependency semantics** | `DEPENDS_ON`, `READS`, `WRITES`, `CONSUMES` | `calls`, `imports`, `references` (all structural) | RIR edges mean something. CG edges are syntax. |
| **Confidence scoring** | `evidence[].confidence` (0-1) | `provenance` on edges only | RIR applies to nodes too. |
| **Constraint system** | `capabilities[].constraints` | None | Can declare prerequisites for features. |
| **Portability** | Single JSON file | SQLite DB + `.codegraph/` dir | IR is trivial to diff, store, transmit. |

---

## 2. RIR Lacking (Needs Work)

| What RIR Lacks | CodeGraph Has It? | CodeGraph Implementation | Impact on RIR |
|---|---|---|---|
| **Signatures** | Yes | `nodes.signature` — full function/method signatures with types | RIR nodes have no type info. Can't answer "what does this method accept/return?" |
| **Docstrings** | Yes | `nodes.docstring` — JSDoc/TSDoc extraction | RIR has zero documentation. Can't generate docs or check doc coverage. |
| **Visibility** | Yes | `nodes.visibility` — public/private/protected | RIR doesn't know access control. Can't detect exposed internals. |
| **Export tracking** | Yes | `nodes.is_exported` | Can't determine public API surface. |
| **Async tracking** | Yes | `nodes.is_async` | Can't identify async boundaries for performance analysis. |
| **Abstract/static tracking** | Yes | `nodes.is_abstract`, `nodes.is_static` | Missing OOP structural info. |
| **Decorators** | Yes (partially) | `nodes.decorators` (JSON array) | RIR knows NestJS exists but doesn't extract `@Controller`, `@Get`, `@Injectable`. These are the actual route definitions. |
| **Type parameters** | Yes | `nodes.type_parameters` | No generics info. |
| **Return types** | Yes | `nodes.return_type` | Can't do return-type-based analysis. |
| **Exact source positions** | Yes | `nodes.start_line/end_line/start_column/end_column` | RIR only has `evidence.locator` (file-level). No line-level precision on nodes. |
| **Qualified names** | Yes | `nodes.qualified_name` — e.g. `Logger::getSubLogger` | RIR uses flat `name`. Can't disambiguate same-name symbols across classes. |
| **Class hierarchy** | Yes | `edges` with kind `extends`/`implements` (219+131 edges) | RIR has no inheritance graph. Can't trace "what implements this interface?" |
| **Instantiation graph** | Yes | `edges` with kind `instantiates` (1,642 edges) | Can't trace "who creates this class?" — critical for DI analysis. |
| **Full call graph** | Yes | 46,659 `calls` edges | RIR has 288 `CALLS` edges. 160x less. |
| **Value references** | Yes | 18,660 `references` edges with `{"valueRef": true}` | Can't trace constant/config usage. |
| **Containment tree** | Yes | 51,475 `contains` edges (file -> symbols) | No file->symbol ownership mapping. |
| **Decorates edges** | Yes | 314 `decorates` edges | Can't trace which decorators are applied where. |
| **Full-text search** | Yes | `nodes_fts` virtual table (FTS5) | Can't search code by name/docstring. |
| **File metadata** | Yes | `files` table: language, size, hash, node count, modified_at | No file-level tracking. |
| **Schema versioning** | Yes | `schema_versions` table with migrations | No versioned schema. |
| **Import granularity** | Yes | 24,280 individual import nodes | RIR collapses all imports into `DEPENDS_ON`. Loses which specific symbols are imported. |
| **Property/field tracking** | Yes | 8,794 `property` nodes | No field-level analysis. DI tokens, class fields, config properties all invisible. |
| **Enum/constant tracking** | Yes | 3,495 `constant` + 84 `enum` + 454 `enum_member` | RIR has 0 constants, 0 enums. Config values and type constants invisible. |
| **Type alias tracking** | Yes | 2,555 `type_alias` nodes | Custom types not tracked. |

---

## 3. Missing in Both (Opportunities)

| Missing Feature | Description | Effort |
|---|---|---|
| **Test coverage mapping** | Neither maps which tests cover which code nodes. RIR has `tested: false` but no data source. | Medium — needs coverage ingestion |
| **Runtime trace integration** | Neither has actual production trace data. RIR has `runtimeObserved` field but it's always `false`. | High — needs APM integration |
| **Dependency version tracking** | Neither tracks npm package versions. | Low |
| **Security annotation** | Neither marks auth-guarded vs unguarded endpoints. | Medium — needs decorator analysis |
| **Performance annotations** | Neither marks hot paths, N+1 queries, or slow operations. | High |
| **Change frequency** | Neither tracks git blame/churn per node. | Medium — needs git integration |
| **Dead code detection** | Neither formally identifies unreachable code. RIR has the field, CG has the graph to compute it. | Low — combine both |

---

## 4. Steals: What RIR Should Take from CodeGraph

### Priority 1: Critical (Steal Immediately)

| What to Steal | How | Value |
|---|---|---|
| **Signatures** | Add `signature` field to every METHOD/FUNCTION node. Extract from AST. | Enables type-aware analysis, better capabilities |
| **Class hierarchy edges** | Add `EXTENDS` and `IMPLEMENTS` edge kinds. | Enables "what implements this?" queries — critical for DI/service analysis |
| **Call graph depth** | RIR has 288 CALLS edges. CG has 46,659. Need to traverse deeper — not just direct calls but transitive. | Closure analysis is shallow without full call graph |
| **Decorators** | Extract NestJS decorators (`@Controller`, `@Get`, `@Injectable`, `@Module`). These ARE the route/handler definitions. | Current routes are only 13. With decorators, RIR would find all 314 routes properly |
| **Containment edges** | Add `CONTAINS` edges: file -> class, class -> method, file -> function. | Enables "what's in this file?" without scanning |

### Priority 2: High Value (Steal Soon)

| What to Steal | How | Value |
|---|---|---|
| **Qualified names** | Change node IDs from flat `name` to hierarchical `Class::method`. | Disambiguates same-name symbols |
| **Return types** | Add `returnType` to METHOD/FUNCTION nodes. | Enables "what type does this return?" for downstream analysis |
| **Visibility** | Add `visibility` field (public/private/protected). | Can detect accidentally exposed internals |
| **is_async** | Add `isAsync` boolean. | Async boundaries matter for error handling and performance |
| **Instantiation edges** | Add `INSTANTIATES` edge kind. | DI container analysis — "who creates what" |
| **Value reference edges** | Add `REFERENCES` edge with `valueRef: true` metadata. | Trace config/constant usage through code |
| **File metadata** | Add `files[]` section to IR with language, size, hash. | Enables file-level impact analysis |

### Priority 3: Nice to Have (Steal Eventually)

| What to Steal | How | Value |
|---|---|---|
| **Full-text search** | Not needed in IR format, but useful for tooling around RIR. | Could add `rir search <query>` CLI command |
| **Docstrings** | Extract JSDoc/TSDoc into `docstring` field. | Enables doc coverage checks, auto-generated docs |
| **Type parameters** | Add `typeParameters` to generic classes/functions. | Complete type information |
| **Enum/constant nodes** | Add `CONSTANT` and `ENUM` node kinds. | Config values become visible |
| **Property nodes** | Add `PROPERTY` node kind for class fields. | DI tokens, injection points visible |
| **Schema versioning** | Add `schemaVersion` to IR JSON header. | Backward-compatible evolution |

---

## 5. Improvements Needed in RIR (Beyond Stealing)

| Improvement | Problem | Fix |
|---|---|---|
| **Route coverage is 4%** | IR has 13 routes. DB has 314. Most are UNMAPPED/ORPHAN. | Fix route extraction — currently only capturing config-style routes, missing NestJS decorator-based routes |
| **Closure is empty** | All 13 capabilities are `ORPHAN` with `expected: [], present: [], missing: []`. | Need to populate the ontology and run closure properly |
| **Edge count is 160x less than CG** | 8,708 IR edges vs 144,689 DB edges. | Need deeper traversal — not just imports but calls, references, instantiation |
| **Execution metadata is always false** | 3,356/3,369 nodes have `reachable: false`. | Need entry-point tracing from `main()`/`bootstrap()` through call graph |
| **No error handling edges** | Neither tracks try/catch, exception filters, error propagation. | Add `CATCHES` and `THROWS` edge kinds |
| **No middleware chain** | NestJS middleware pipeline invisible. | Add `MIDDLEWARE` node kind and `WRAPS` edges |
| **No DI container mapping** | Can't trace which module provides which service. | Add `PROVIDES` edges from MODULE nodes to SERVICE/REPOSITORY nodes |

---

## 6. Quick Reference: Field Comparison

| Field | CodeGraph Node | RIR Node | Action |
|---|---|---|---|
| `id` | Yes (structured: `file:`, `import:`, `method:`) | Yes (`module\|`, `method\|`, etc.) | Keep RIR format |
| `kind` | Yes (14 kinds) | Yes (13 kinds) | Align kinds |
| `name` | Yes | Yes | Keep |
| `qualified_name` | Yes (`Class::method`) | **Missing** | **Steal** |
| `file_path` | Yes | Yes (in evidence) | Promote to node field |
| `start_line/end_line` | Yes | **Missing** (only in evidence) | **Steal** |
| `start_column/end_column` | Yes | **Missing** | **Steal** |
| `signature` | Yes | **Missing** | **Steal** |
| `docstring` | Yes | **Missing** | Steal eventually |
| `visibility` | Yes | **Missing** | **Steal** |
| `is_exported` | Yes | **Missing** | Steal eventually |
| `is_async` | Yes | **Missing** | **Steal** |
| `is_static` | Yes | **Missing** | Steal eventually |
| `is_abstract` | Yes | **Missing** | Steal eventually |
| `decorators` | Yes (JSON) | **Missing** | **Steal** (critical for NestJS) |
| `type_parameters` | Yes | **Missing** | Steal eventually |
| `return_type` | Yes | **Missing** | **Steal** |
| `execution.reachable` | **Missing** | Yes | Keep (RIR unique) |
| `execution.runtimeObserved` | **Missing** | Yes | Keep (RIR unique) |
| `execution.tested` | **Missing** | Yes | Keep (RIR unique) |
| `execution.entryDistance` | **Missing** | Yes | Keep (RIR unique) |
| `evidence` | **Missing** (on nodes) | Yes | Keep (RIR unique) |
| `evidence.confidence` | **Missing** | Yes | Keep (RIR unique) |

---

## 7. Quick Reference: Edge Comparison

| Edge Kind | CodeGraph | RIR | Action |
|---|---|---|---|
| `contains` | 51,475 | **Missing** | **Steal** |
| `calls` | 46,659 | 288 (`CALLS`) | **Deepen** — 160x gap |
| `imports` | 25,589 | 4,121 (`IMPORTS`) | **Deepen** |
| `references` | 18,660 | **Missing** | **Steal** |
| `instantiates` | 1,642 | **Missing** | **Steal** |
| `decorates` | 314 | **Missing** | **Steal** (critical for NestJS) |
| `extends` | 219 | **Missing** | **Steal** |
| `implements` | 131 | **Missing** | **Steal** |
| `DEPENDS_ON` | **Missing** | 4,121 | Keep (RIR semantic) |
| `READS` | **Missing** | 100 | Keep (RIR semantic) |
| `WRITES` | **Missing** | 67 | Keep (RIR semantic) |
| `CONSUMES` | **Missing** | 11 | Keep (RIR semantic) |

---

## 8. Recommended IR Schema Additions

```jsonc
{
  "schemaVersion": "1.1.0",

  "nodes": [
    {
      "id": "method|...",
      "kind": "METHOD",
      "name": "getSubLogger",
      "qualifiedName": "Logger::getSubLogger",       // NEW
      "filePath": "apps/api/v2/src/lib/logger.bridge.ts",  // NEW (promoted)
      "span": {                                        // NEW (richer)
        "startLine": 64,
        "endLine": 69,
        "startColumn": 2,
        "endColumn": 3
      },
      "signature": "(options: { prefix?: string[] }): TsLogger<unknown>",  // NEW
      "docstring": "Creates a new LoggerBridge...",   // NEW
      "visibility": "public",                          // NEW
      "isExported": false,                             // NEW
      "isAsync": false,                                // NEW
      "decorators": [],                                // NEW
      "returnType": "TsLogger<unknown>",               // NEW
      "typeParameters": [],                            // NEW
      "execution": { ... },                            // KEEP
      "evidence": [ ... ]                              // KEEP
    }
  ],

  "edges": [
    // KEEP existing
    { "kind": "IMPORTS", ... },
    { "kind": "DEPENDS_ON", ... },
    { "kind": "CALLS", ... },

    // STEAL from CodeGraph
    { "kind": "CONTAINS", "from": "module|...", "to": "method|..." },
    { "kind": "EXTENDS", "from": "class|...", "to": "class|..." },
    { "kind": "IMPLEMENTS", "from": "class|...", "to": "interface|..." },
    { "kind": "INSTANTIATES", "from": "method|...", "to": "class|..." },
    { "kind": "REFERENCES", "from": "method|...", "to": "constant|...", "metadata": {"valueRef": true} },
    { "kind": "DECORATES", "from": "decorator|...", "to": "class|..." }
  ],

  // KEEP existing
  "capabilities": [...],
  "closure": [...],
  "routes": [...],

  // NEW from CodeGraph
  "files": [
    {
      "path": "apps/api/v2/src/app.controller.ts",
      "language": "typescript",
      "size": 1234,
      "contentHash": "abc123",
      "nodeCount": 5
    }
  ]
}
```

---

## Appendix: Reference Repository

| Property | Value |
|---|---|
| **Repository** | [cal.com](https://github.com/calcom/cal.com) |
| **Path** | `D:\rir-targets\cal.com` |
| **CodeGraph DB** | `D:\rir-targets\cal.com\.codegraph\codegraph.db` |
| **RIR Output** | `D:\rir-targets\cal.com-ir.json` |
| **CodeGraph Version** | 1.1.2 (extraction v24) |
| **Language** | TypeScript (3,876 `.ts` + 1,147 `.tsx` files indexed) |
| **Scope of Analysis** | `apps/api/v2/src` (NestJS backend) |
| **DB Stats** | 56,871 nodes, 144,689 edges, 5,150 files |
| **IR Stats** | 3,369 nodes, 8,708 edges, 13 capabilities, 13 routes |
| **Date** | 2026-06-29 |
