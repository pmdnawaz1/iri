/**
 * EOS Project IR — the architectural source of truth.
 *
 * Every executable unit of the repository is a TSPEC here. The Project Compiler
 * (compile.ts) validates this dataset and compiles it into per-TSPEC YAML plus the
 * machine-readable project state files. Edit intrinsic fields here; never hand-edit
 * generated artifacts. Owner is exactly one role. References are provided so the
 * implementer never searches for architecture.
 */

import { Complexity, Priority, Risk, Role, type TspecSource } from "./types.js";

// --- Shared reference libraries (so implementers never search) ---------------
const REF = {
  treeSitter: "https://tree-sitter.github.io/tree-sitter/",
  astGrep: "https://ast-grep.github.io/",
  fastify: "https://fastify.dev/docs/latest/",
  zod: "https://zod.dev/",
  kysely: "https://kysely.dev/docs/intro",
  betterSqlite: "https://github.com/WiseLibs/better-sqlite3",
  vitest: "https://vitest.dev/guide/",
  remark: "https://github.com/remarkjs/remark",
  openapi: "https://spec.openapis.org/oas/latest.html",
  asyncapi: "https://www.asyncapi.com/docs/reference/specification/latest",
  jsonSchema: "https://json-schema.org/specification",
  graphology: "https://graphology.github.io/",
  tarjanScc: "https://en.wikipedia.org/wiki/Tarjan%27s_strongly_connected_components_algorithm",
  llvmPasses: "https://llvm.org/docs/WritingAnLLVMNewPMPass.html",
  pino: "https://getpino.io/",
  fastCheck: "https://fast-check.dev/",
  otel: "https://opentelemetry.io/docs/",
} as const;

const ADR = {
  rir: "docs/ADR-0001-repository-ir.md",
  closure: "docs/ADR-0002-execution-closure.md",
} as const;

const DOC = {
  requirement: "requirement.md",
  structure: "repo_structure.md",
  decisionLow: "decision1.md",
  decisionHigh: "decision2.md",
} as const;

/** Forbidden-change sets shared across owners (from the decision manuals). */
const FORBID_IMPL = [
  "Repository IR schema",
  "Requirement IR schema",
  "Ontology ids / properties",
  "Compiler pipeline / builder order",
  "Closure / coverage / consistency rules",
];
const FORBID_ARCH = ["Implementation code beyond reference snippets", "CRUD / boilerplate"];

type Init = Pick<TspecSource, "id" | "title" | "owner" | "package" | "module"> & Partial<TspecSource>;

/** Factory: fills deterministic defaults so every TSPEC is fully specified. */
function T(init: Init): TspecSource {
  const archDefaults = init.owner === Role.Architect;
  return {
    priority: Priority.P2,
    complexity: Complexity.Medium,
    risk: Risk.Medium,
    estimated_effort: 3,
    depends_on: [],
    references: [],
    architecture_documents: [
      DOC.structure,
      DOC.requirement,
      archDefaults ? DOC.decisionHigh : DOC.decisionLow,
    ],
    deliverables: [],
    outputs: [],
    tests: archDefaults ? ["ADR review", "schema golden test"] : ["unit", "integration", "golden"],
    acceptance_criteria: archDefaults
      ? ["ADR accepted", "No ambiguity remains", "Versioned"]
      : ["Builds", "Typechecks", "Lint clean", "Tests pass", "Coverage >= 95%"],
    forbidden_changes: archDefaults ? FORBID_ARCH : FORBID_IMPL,
    labels: [init.owner === Role.Architect ? "architecture" : "implementation", init.package],
    ...init,
  };
}

// ---------------------------------------------------------------------------
// WAVE A — Architect contracts (ROLE_ARCHITECT). Define meaning; little code.
// ---------------------------------------------------------------------------
const ARCHITECT: TspecSource[] = [
  T({
    id: "TSPEC-A001",
    title: "Repository IR v1",
    owner: Role.Architect,
    package: "ir",
    module: "schema",
    priority: Priority.P0,
    risk: Risk.High,
    complexity: Complexity.High,
    estimated_effort: 5,
    architecture_documents: [ADR.rir, DOC.requirement, DOC.decisionHigh],
    references: [REF.llvmPasses, REF.jsonSchema],
    deliverables: ["NodeIR/EdgeIR/ArtifactIR/CapabilityIR/EvidenceIR schemas", ADR.rir],
    outputs: ["@rir/ir"],
  }),
  T({
    id: "TSPEC-A002",
    title: "Requirement IR",
    owner: Role.Architect,
    package: "ir",
    module: "requirement",
    priority: Priority.P0,
    risk: Risk.High,
    estimated_effort: 4,
    depends_on: ["TSPEC-A001"],
    deliverables: ["RequirementIR / RequirementSet schema"],
    outputs: ["@rir/ir"],
  }),
  T({
    id: "TSPEC-A003",
    title: "Capability Ontology",
    owner: Role.Architect,
    package: "ontology",
    module: "ontology",
    priority: Priority.P0,
    risk: Risk.High,
    complexity: Complexity.High,
    estimated_effort: 5,
    depends_on: ["TSPEC-A001"],
    references: ["https://schema.org/", "https://www.w3.org/RDF/"],
    deliverables: ["Feature/Capability/Constraint definitions", "AUTH fully specified"],
    outputs: ["@rir/ontology"],
  }),
  T({
    id: "TSPEC-A004",
    title: "Graph Semantics",
    owner: Role.Architect,
    package: "graph",
    module: "semantics",
    priority: Priority.P1,
    estimated_effort: 3,
    depends_on: ["TSPEC-A001"],
    references: [REF.tarjanScc, REF.graphology],
    deliverables: ["Node/edge traversal & reachability semantics"],
  }),
  T({
    id: "TSPEC-A005",
    title: "Compiler Pipeline & Builder Contracts",
    owner: Role.Architect,
    package: "core",
    module: "pipeline",
    priority: Priority.P0,
    risk: Risk.High,
    complexity: Complexity.High,
    estimated_effort: 5,
    depends_on: ["TSPEC-A001"],
    references: [REF.llvmPasses],
    deliverables: ["Compiler/Builder/Pass/IRDraft interfaces", "PluginRegistry ordering"],
    outputs: ["@rir/core"],
  }),
  T({
    id: "TSPEC-A006",
    title: "Pass Roster & Ordering",
    owner: Role.Architect,
    package: "passes",
    module: "roster",
    priority: Priority.P1,
    estimated_effort: 3,
    depends_on: ["TSPEC-A005"],
    deliverables: ["Canonical pass names + fixed priorities"],
  }),
  T({
    id: "TSPEC-A007",
    title: "Language Adapter Contract",
    owner: Role.Architect,
    package: "code-compiler",
    module: "contract",
    priority: Priority.P1,
    estimated_effort: 3,
    depends_on: ["TSPEC-A005"],
    references: [REF.treeSitter, REF.astGrep],
    deliverables: ["LanguageAdapter interface (parse/symbols/imports/exports/calls/routes)"],
  }),
  T({
    id: "TSPEC-A008",
    title: "Document Compiler Semantics",
    owner: Role.Architect,
    package: "document-compiler",
    module: "semantics",
    priority: Priority.P1,
    risk: Risk.High,
    estimated_effort: 4,
    depends_on: ["TSPEC-A002", "TSPEC-A003"],
    references: [REF.remark],
    deliverables: ["statement->assertion->Requirement IR normalization rules"],
  }),
  T({
    id: "TSPEC-A009",
    title: "Execution Closure Algorithm",
    owner: Role.Architect,
    package: "closure",
    module: "algorithm",
    priority: Priority.P0,
    risk: Risk.High,
    complexity: Complexity.High,
    estimated_effort: 5,
    depends_on: ["TSPEC-A003", "TSPEC-A004"],
    architecture_documents: [ADR.closure, DOC.decisionHigh],
    deliverables: ["Stage mapping + closure classification rules", ADR.closure],
  }),
  T({
    id: "TSPEC-A010",
    title: "Coverage Rules",
    owner: Role.Architect,
    package: "coverage",
    module: "rules",
    priority: Priority.P1,
    estimated_effort: 3,
    depends_on: ["TSPEC-A003"],
    deliverables: ["Coverage dimension definitions"],
  }),
  T({
    id: "TSPEC-A011",
    title: "Consistency Rules",
    owner: Role.Architect,
    package: "consistency",
    module: "rules",
    priority: Priority.P1,
    estimated_effort: 3,
    depends_on: ["TSPEC-A003"],
    deliverables: ["Finding codes + severity model"],
  }),
  T({
    id: "TSPEC-A012",
    title: "Storage Schema",
    owner: Role.Architect,
    package: "storage",
    module: "schema",
    priority: Priority.P1,
    estimated_effort: 3,
    depends_on: ["TSPEC-A001"],
    references: [REF.betterSqlite, REF.kysely],
    deliverables: ["Canonical SQLite DDL", "Storage interface"],
  }),
  T({
    id: "TSPEC-A013",
    title: "Query Language",
    owner: Role.Architect,
    package: "query-engine",
    module: "querylang",
    priority: Priority.P2,
    estimated_effort: 3,
    depends_on: ["TSPEC-A004"],
    deliverables: ["Subgraph extraction & expansion semantics"],
  }),
  T({
    id: "TSPEC-A014",
    title: "Semantic Projection Contract",
    owner: Role.Architect,
    package: "semantic",
    module: "contract",
    priority: Priority.P3,
    estimated_effort: 2,
    depends_on: ["TSPEC-A013"],
    deliverables: ["Read-only LLM projection contract; AI isolation rules"],
  }),
  T({
    id: "TSPEC-A015",
    title: "Telemetry Evidence Model",
    owner: Role.Architect,
    package: "telemetry",
    module: "model",
    priority: Priority.P3,
    estimated_effort: 2,
    depends_on: ["TSPEC-A001"],
    references: [REF.otel],
    deliverables: ["RuntimeTrace -> EvidenceIR mapping"],
  }),
];

// ---------------------------------------------------------------------------
// WAVE B+ — Implementer TSPECs (ROLE_IMPLEMENTER). Production code.
// ---------------------------------------------------------------------------
const FOUNDATION: TspecSource[] = [
  T({
    id: "TSPEC-I001",
    title: "Common utilities",
    owner: Role.Implementer,
    package: "common",
    module: "common",
    priority: Priority.P1,
    complexity: Complexity.Low,
    risk: Risk.Low,
    estimated_effort: 2,
    depends_on: ["TSPEC-A005"],
    references: [REF.pino],
    deliverables: ["logger", "errors", "hash64", "makeId"],
    outputs: ["@rir/common"],
  }),
  T({
    id: "TSPEC-I002",
    title: "IR serializer & validator",
    owner: Role.Implementer,
    package: "ir",
    module: "validator",
    priority: Priority.P1,
    estimated_effort: 3,
    depends_on: ["TSPEC-A001", "TSPEC-A002"],
    references: [REF.zod],
    deliverables: ["Deterministic serializer", "Schema guards"],
  }),
  T({
    id: "TSPEC-I003",
    title: "Graph algorithms",
    owner: Role.Implementer,
    package: "graph",
    module: "algorithms",
    priority: Priority.P1,
    estimated_effort: 3,
    depends_on: ["TSPEC-A004"],
    references: [REF.tarjanScc],
    deliverables: ["reachableFrom", "distancesFrom", "topologicalSort", "SCC", "connectedComponents"],
  }),
  T({
    id: "TSPEC-I004",
    title: "SQLite storage repository",
    owner: Role.Implementer,
    package: "storage",
    module: "sqlite",
    priority: Priority.P1,
    risk: Risk.Medium,
    estimated_effort: 4,
    depends_on: ["TSPEC-A012", "TSPEC-I001"],
    references: [REF.betterSqlite, REF.kysely],
    deliverables: ["SQLite Storage impl", "Migrations", "CRUD + transactions"],
  }),
  T({
    id: "TSPEC-I005",
    title: "Core pipeline, DI & registry impl",
    owner: Role.Implementer,
    package: "core",
    module: "runtime",
    priority: Priority.P1,
    estimated_effort: 3,
    depends_on: ["TSPEC-A005", "TSPEC-I001"],
    deliverables: ["PluginRegistry", "Container", "IRDraft"],
  }),
  T({
    id: "TSPEC-I006",
    title: "Builder engine pass runner",
    owner: Role.Implementer,
    package: "builder-engine",
    module: "engine",
    priority: Priority.P1,
    estimated_effort: 3,
    depends_on: ["TSPEC-A005", "TSPEC-A006", "TSPEC-I005"],
    deliverables: ["BuilderEngine", "DefaultIRDraft"],
  }),
  T({
    id: "TSPEC-I007",
    title: "Ontology validators",
    owner: Role.Implementer,
    package: "ontology",
    module: "validators",
    priority: Priority.P2,
    estimated_effort: 2,
    depends_on: ["TSPEC-A003"],
    deliverables: ["Constraint validators", "Alias resolution tests"],
  }),
];

// Language adapters (one TSPEC each) ----------------------------------------
const ADAPTER_LANGS = ["typescript", "javascript", "python", "java", "go", "rust", "csharp"] as const;
const ADAPTERS: TspecSource[] = ADAPTER_LANGS.map((lang, i) =>
  T({
    id: `TSPEC-AD${String(i + 1).padStart(2, "0")}`,
    title: `${lang} language adapter`,
    owner: Role.Implementer,
    package: "code-compiler",
    module: `language/${lang}`,
    priority: lang === "typescript" ? Priority.P1 : Priority.P2,
    estimated_effort: lang === "typescript" ? 4 : 3,
    depends_on: ["TSPEC-A007", "TSPEC-I006"],
    references: [REF.treeSitter, REF.astGrep],
    deliverables: [`${lang} Tree-sitter adapter: parse/symbols/imports/exports/calls/routes`],
  }),
);

// Document frontends ---------------------------------------------------------
const DOC_FORMATS: Array<[string, string]> = [
  ["markdown", REF.remark],
  ["openapi", REF.openapi],
  ["asyncapi", REF.asyncapi],
  ["json-schema", REF.jsonSchema],
  ["pdf", "https://mozilla.github.io/pdf.js/"],
  ["docx", "https://github.com/dolanmiu/docx"],
];
const FRONTENDS: TspecSource[] = DOC_FORMATS.map(([fmt, ref], i) =>
  T({
    id: `TSPEC-DF${String(i + 1).padStart(2, "0")}`,
    title: `${fmt} document frontend`,
    owner: Role.Implementer,
    package: "document-compiler",
    module: `frontend/${fmt}`,
    priority: fmt === "markdown" ? Priority.P1 : Priority.P2,
    estimated_effort: 3,
    depends_on: ["TSPEC-A008"],
    references: [ref],
    deliverables: [`${fmt} structure extraction (no semantics)`],
  }),
);

// Compiler passes (one TSPEC each) ------------------------------------------
const PASS_LIST = [
  "ImportPass",
  "CallPass",
  "RoutePass",
  "ComponentPass",
  "SQLPass",
  "EventPass",
  "DependencyPass",
  "OwnershipPass",
  "CapabilityPass",
  "ConstraintPass",
  "FlowPass",
  "ReachabilityPass",
  "DocumentationPass",
  "RuntimePass",
  "GitPass",
] as const;
const PASSES: TspecSource[] = PASS_LIST.map((name, i) =>
  T({
    id: `TSPEC-P${String(i + 1).padStart(2, "0")}`,
    title: name,
    owner: Role.Implementer,
    package: "passes",
    module: name,
    priority: Priority.P2,
    estimated_effort: 3,
    depends_on: ["TSPEC-A006", "TSPEC-I006"],
    references: [REF.llvmPasses],
    deliverables: [`${name}: deterministic facts into IRDraft`],
  }),
);

// Engine implementations -----------------------------------------------------
const ENGINES: TspecSource[] = [
  T({
    id: "TSPEC-E01",
    title: "Closure engine impl",
    owner: Role.Implementer,
    package: "closure",
    module: "engine",
    priority: Priority.P1,
    risk: Risk.High,
    estimated_effort: 4,
    depends_on: ["TSPEC-A009", "TSPEC-I003", "TSPEC-P09", "TSPEC-P12"],
    deliverables: ["DefaultClosureEngine over RIR"],
  }),
  T({
    id: "TSPEC-E02",
    title: "Coverage engine impl",
    owner: Role.Implementer,
    package: "coverage",
    module: "engine",
    priority: Priority.P2,
    estimated_effort: 3,
    depends_on: ["TSPEC-A010"],
    deliverables: ["DefaultCoverageEngine"],
  }),
  T({
    id: "TSPEC-E03",
    title: "Consistency engine impl",
    owner: Role.Implementer,
    package: "consistency",
    module: "engine",
    priority: Priority.P2,
    estimated_effort: 3,
    depends_on: ["TSPEC-A011"],
    deliverables: ["DefaultConsistencyEngine"],
  }),
  T({
    id: "TSPEC-E04",
    title: "Query engine impl",
    owner: Role.Implementer,
    package: "query-engine",
    module: "engine",
    priority: Priority.P2,
    estimated_effort: 3,
    depends_on: ["TSPEC-A013", "TSPEC-I003"],
    deliverables: ["QueryEngine subgraph extraction"],
  }),
  T({
    id: "TSPEC-E05",
    title: "Semantic projector impl",
    owner: Role.Implementer,
    package: "semantic",
    module: "projector",
    priority: Priority.P3,
    estimated_effort: 2,
    depends_on: ["TSPEC-A014", "TSPEC-E04"],
    deliverables: ["SemanticProjector (read-only)"],
  }),
  T({
    id: "TSPEC-E06",
    title: "Telemetry ingestor impl",
    owner: Role.Implementer,
    package: "telemetry",
    module: "ingestor",
    priority: Priority.P3,
    estimated_effort: 2,
    depends_on: ["TSPEC-A015"],
    references: [REF.otel],
    deliverables: ["DefaultTelemetryIngestor"],
  }),
];

// Apps -----------------------------------------------------------------------
const APPS: TspecSource[] = [
  T({
    id: "TSPEC-APP1",
    title: "CLI",
    owner: Role.Implementer,
    package: "cli",
    module: "app",
    priority: Priority.P2,
    estimated_effort: 3,
    depends_on: ["TSPEC-E01", "TSPEC-E02", "TSPEC-E04", "TSPEC-I004"],
    deliverables: ["rir compile/diff/query/graph/validate/snapshot"],
  }),
  T({
    id: "TSPEC-APP2",
    title: "Compiler API",
    owner: Role.Implementer,
    package: "compiler-api",
    module: "app",
    priority: Priority.P2,
    estimated_effort: 3,
    depends_on: ["TSPEC-E01", "TSPEC-E02", "TSPEC-E03", "TSPEC-E04"],
    references: [REF.fastify, REF.zod],
    deliverables: ["REST endpoints wired to engines"],
  }),
  T({
    id: "TSPEC-APP3",
    title: "Worker",
    owner: Role.Implementer,
    package: "worker",
    module: "app",
    priority: Priority.P3,
    estimated_effort: 2,
    depends_on: ["TSPEC-I004", "TSPEC-I006"],
    deliverables: ["Job registry + dispatch"],
  }),
];

// Fixtures, scripts, benchmarks, CI -----------------------------------------
const FIXTURE_NAMES = [
  "express-auth",
  "nestjs",
  "react",
  "next",
  "vue",
  "java",
  "go",
  "microservices",
  "broken-repository",
] as const;
const FIXTURES: TspecSource[] = FIXTURE_NAMES.map((name, i) =>
  T({
    id: `TSPEC-FX${String(i + 1).padStart(2, "0")}`,
    title: `Fixture: ${name}`,
    owner: Role.Implementer,
    package: "fixtures",
    module: name,
    priority: Priority.P2,
    complexity: Complexity.Low,
    risk: Risk.Low,
    estimated_effort: 1,
    depends_on: ["TSPEC-AD01"],
    deliverables: [`Tiny ${name} repository + expected Repository IR golden`],
    tests: ["golden"],
  }),
);

// Per-language adapter-validation fixtures (each depends on its language adapter).
const LANG_FIXTURE_DEFS: Array<[string, string, string]> = [
  ["FX10", "python", "TSPEC-AD03"],
  ["FX11", "rust", "TSPEC-AD06"],
  ["FX12", "csharp", "TSPEC-AD07"],
];
const LANG_FIXTURES: TspecSource[] = LANG_FIXTURE_DEFS.map(([id, name, adapter]) =>
  T({
    id: `TSPEC-${id}`,
    title: `Fixture: ${name}`,
    owner: Role.Implementer,
    package: "fixtures",
    module: name,
    priority: Priority.P2,
    complexity: Complexity.Low,
    risk: Risk.Low,
    estimated_effort: 1,
    depends_on: [adapter],
    deliverables: [`Tiny ${name} module + ${name} adapter validation`],
    tests: ["golden"],
  }),
);

const TOOLING: TspecSource[] = [
  T({
    id: "TSPEC-SC01",
    title: "Script: compile-fixtures",
    owner: Role.Implementer,
    package: "scripts",
    module: "compile-fixtures",
    priority: Priority.P2,
    estimated_effort: 2,
    depends_on: ["TSPEC-APP1"],
    deliverables: ["compile all fixtures to golden IR"],
  }),
  T({
    id: "TSPEC-SC02",
    title: "Script: generate-ontology",
    owner: Role.Implementer,
    package: "scripts",
    module: "generate-ontology",
    priority: Priority.P3,
    estimated_effort: 1,
    depends_on: ["TSPEC-A003"],
    deliverables: ["ontology export tool"],
  }),
  T({
    id: "TSPEC-SC03",
    title: "Benchmark suite",
    owner: Role.Implementer,
    package: "scripts",
    module: "benchmark",
    priority: Priority.P3,
    estimated_effort: 2,
    depends_on: ["TSPEC-APP1"],
    references: ["https://github.com/tinylibs/tinybench"],
    deliverables: ["compile-time / memory / graph-size benchmarks"],
    tests: ["performance"],
  }),
  T({
    id: "TSPEC-CI01",
    title: "CI/CD gates workflow",
    owner: Role.Implementer,
    package: "ci",
    module: "github-actions",
    priority: Priority.P1,
    estimated_effort: 2,
    depends_on: ["TSPEC-I001"],
    references: ["https://docs.github.com/actions"],
    deliverables: [".github/workflows/eos.yml enforcing all gates"],
  }),
];

/** The complete Project IR. Order is irrelevant; the compiler derives waves. */
export const DATASET: readonly TspecSource[] = [
  ...ARCHITECT,
  ...FOUNDATION,
  ...ADAPTERS,
  ...FRONTENDS,
  ...PASSES,
  ...ENGINES,
  ...APPS,
  ...FIXTURES,
  ...LANG_FIXTURES,
  ...TOOLING,
];
