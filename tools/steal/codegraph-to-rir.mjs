#!/usr/bin/env node
/**
 * STEAL TRANSFORM (ADR-0025): CodeGraph SQLite (.codegraph/codegraph.db) -> RIR IR JSON.
 *
 * This is the *executable* steal. CodeGraph already produced a deep graph (signatures,
 * qualified names, decorators, contains/extends/implements/instantiates/references edges).
 * Rather than reimplement that from scratch, we MAP its schema onto RIR's IR — and this
 * mapping is the canonical field/edge-kind spec the F01-F29 work orders implement and
 * validate against (their native extractors must reproduce this output for the same repo).
 *
 * Usage:
 *   node --experimental-sqlite tools/steal/codegraph-to-rir.mjs <path-to/codegraph.db> [out.json]
 *
 * RIR keeps a single portable JSON; we never adopt CodeGraph's SQLite at runtime.
 */
import { DatabaseSync } from "node:sqlite";
import { writeFileSync } from "node:fs";

const dbPath = process.argv[2];
const outPath = process.argv[3] ?? "rir-from-codegraph.json";
if (!dbPath) {
  console.error("usage: node --experimental-sqlite tools/steal/codegraph-to-rir.mjs <codegraph.db> [out.json]");
  process.exit(64);
}

// --- The mapping (CG -> RIR). This table IS the steal spec. -------------------
// CG NodeKind (structural) -> RIR NodeKind. RIR gains these structural kinds (F05/F06/F07);
// uppercase-of-CG is the canonical RIR kind name. Domain roles (CONTROLLER/SERVICE/...) are
// layered on by RIR's own CapabilityPass afterwards — the transform supplies the structure.
const NODE_KIND = (k) => k.toUpperCase(); // file->FILE, class->CLASS, method->METHOD, route->ROUTE, enum_member->ENUM_MEMBER, ...
// CG EdgeKind -> RIR EdgeKind (F08-F12 add the structural ones; calls/imports already exist).
const EDGE_KIND = (k) => k.toUpperCase(); // contains->CONTAINS, calls->CALLS, extends->EXTENDS, instantiates->INSTANTIATES, decorates->DECORATES, references->REFERENCES, ...

const db = new DatabaseSync(dbPath, { readOnly: true });
const J = (s) => {
  try {
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
};
const artId = (file) => `art|${file}`;

const cgNodes = db.prepare("SELECT * FROM nodes").all();
const cgEdges = db.prepare("SELECT source, target, kind, metadata, line, col, provenance FROM edges").all();
let cgFiles = [];
try {
  cgFiles = db.prepare("SELECT path, content_hash, language, size, node_count FROM files").all();
} catch {
  cgFiles = [];
}

const nodes = cgNodes.map((n) => ({
  id: n.id,
  kind: NODE_KIND(n.kind),
  name: n.name,
  qualifiedName: n.qualified_name, // F02
  filePath: n.file_path, // F02
  language: n.language ?? null,
  artifactId: artId(n.file_path),
  span: {
    startLine: n.start_line,
    endLine: n.end_line,
    startColumn: n.start_column,
    endColumn: n.end_column,
  },
  hash: "",
  signature: n.signature ?? undefined, // F01
  returnType: n.return_type ?? undefined, // F01
  typeParameters: J(n.type_parameters), // F01
  visibility: n.visibility ?? undefined, // F01
  isExported: !!n.is_exported, // F01
  isAsync: !!n.is_async, // F01
  isStatic: !!n.is_static, // F01
  isAbstract: !!n.is_abstract, // F01
  decorators: J(n.decorators), // F03
  docstring: n.docstring ?? undefined, // F04
  // RIR-unique (kept): RIR's ReachabilityPass populates these afterwards.
  execution: { reachable: false, entryDistance: null, runtimeObserved: false, tested: false },
  evidence: [{ source: "AST", locator: `${n.file_path}#${n.start_line}`, confidence: 1 }],
}));

const edges = cgEdges.map((e, i) => ({
  id: `edge|${i}`,
  kind: EDGE_KIND(e.kind),
  from: e.source,
  to: e.target,
  // CG provenance 'heuristic' (synthesized/dynamic) -> lower confidence (F16 parity).
  evidence: [
    {
      source: "AST",
      locator: e.line != null ? `:${e.line}` : "",
      confidence: e.provenance === "heuristic" ? 0.6 : 1,
    },
  ],
  metadata: J(e.metadata),
}));

const artifacts = cgFiles.map((f) => ({
  id: artId(f.path),
  kind: "CODE",
  path: f.path,
  language: f.language ?? null,
  hash: f.content_hash ?? "",
}));

const files = cgFiles.map((f) => ({
  path: f.path,
  language: f.language ?? null,
  size: f.size ?? 0,
  contentHash: f.content_hash ?? "",
  nodeCount: f.node_count ?? 0,
}));

const ir = {
  version: "1.0.0",
  schemaVersion: "1.1.0", // F22
  nodes,
  edges,
  artifacts,
  capabilities: [], // RIR's CapabilityPass runs on this structural IR separately
  files, // F21
};

writeFileSync(outPath, JSON.stringify(ir, null, 2));
const byNodeKind = {};
for (const n of nodes) byNodeKind[n.kind] = (byNodeKind[n.kind] ?? 0) + 1;
const byEdgeKind = {};
for (const e of edges) byEdgeKind[e.kind] = (byEdgeKind[e.kind] ?? 0) + 1;
console.error(
  `transformed ${nodes.length} nodes, ${edges.length} edges, ${files.length} files -> ${outPath}\n` +
    `node kinds: ${JSON.stringify(byNodeKind)}\nedge kinds: ${JSON.stringify(byEdgeKind)}`,
);
