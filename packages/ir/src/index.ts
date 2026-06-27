/**
 * @rir/ir — Canonical Intermediate Representation.
 *
 * This package defines the ONLY source of truth for the compiler: the Repository
 * IR (RIR) and the Requirement IR. It contains schemas and provenance, never
 * parser logic and never natural language as truth.
 *
 * ARCHITECTURE NOTE (owned by high-reasoning AI): These schemas are versioned and
 * effectively immutable once released. Field renames, new fields, or new enum
 * members are breaking changes requiring a version bump + migration. Low-reasoning
 * implementers must NOT add fields here.
 */

export const RIR_VERSION = "1.0.0" as const;
export const REQUIREMENT_IR_VERSION = "1.0.0" as const;

// ---------------------------------------------------------------------------
// Enumerations (closed vocabularies)
// ---------------------------------------------------------------------------

/** Kind of a node in the Repository IR graph. */
export const NodeKind = {
  Module: "MODULE",
  Function: "FUNCTION",
  Class: "CLASS",
  Method: "METHOD",
  Variable: "VARIABLE",
  Type: "TYPE",
  Interface: "INTERFACE",
  Route: "ROUTE",
  Controller: "CONTROLLER",
  Service: "SERVICE",
  Repository: "REPOSITORY",
  Component: "COMPONENT",
  Handler: "HANDLER",
  ApiCall: "API_CALL",
  SqlQuery: "SQL_QUERY",
  Table: "TABLE",
  Event: "EVENT",
  EventConsumer: "EVENT_CONSUMER",
  Entrypoint: "ENTRYPOINT",
  Test: "TEST",
  Document: "DOCUMENT",
} as const;
export type NodeKind = (typeof NodeKind)[keyof typeof NodeKind];

/** Kind of a directed edge (relation) between two nodes. */
export const EdgeKind = {
  Imports: "IMPORTS",
  Exports: "EXPORTS",
  Calls: "CALLS",
  CalledBy: "CALLED_BY",
  Implements: "IMPLEMENTS",
  Inherits: "INHERITS",
  DependsOn: "DEPENDS_ON",
  Renders: "RENDERS",
  Emits: "EMITS",
  Consumes: "CONSUMES",
  Reads: "READS",
  Writes: "WRITES",
  RoutesTo: "ROUTES_TO",
  Tests: "TESTS",
  Documents: "DOCUMENTS",
} as const;
export type EdgeKind = (typeof EdgeKind)[keyof typeof EdgeKind];

/** Source of evidence backing a node or edge. Nothing exists without provenance. */
export const EvidenceSource = {
  Ast: "AST",
  Runtime: "RUNTIME",
  Tests: "TESTS",
  Documentation: "DOCUMENTATION",
  Git: "GIT",
} as const;
export type EvidenceSource = (typeof EvidenceSource)[keyof typeof EvidenceSource];

/** Artifact category compiled into the IR. */
export const ArtifactKind = {
  Code: "CODE",
  Document: "DOCUMENT",
  ApiSpec: "API_SPEC",
  Schema: "SCHEMA",
  Test: "TEST",
  Runtime: "RUNTIME",
  Git: "GIT",
} as const;
export type ArtifactKind = (typeof ArtifactKind)[keyof typeof ArtifactKind];

/** Execution-closure state of a capability. */
export const ClosureState = {
  Closed: "CLOSED",
  Partial: "PARTIAL",
  Broken: "BROKEN",
  Orphan: "ORPHAN",
  Unreachable: "UNREACHABLE",
  Conflicting: "CONFLICTING",
} as const;
export type ClosureState = (typeof ClosureState)[keyof typeof ClosureState];

/** Requirement priority (MoSCoW). */
export const Priority = {
  Must: "MUST",
  Should: "SHOULD",
  Could: "COULD",
  Wont: "WONT",
} as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

// ---------------------------------------------------------------------------
// Core value objects
// ---------------------------------------------------------------------------

/** Source location of a node within a file. */
export interface Span {
  readonly startLine: number;
  readonly startColumn: number;
  readonly endLine: number;
  readonly endColumn: number;
}

/** Provenance for a fact in the IR. Every node and edge carries at least one. */
export interface EvidenceIR {
  readonly source: EvidenceSource;
  /** Where the evidence was observed (file path, test id, commit sha, trace id). */
  readonly locator: string;
  /** Deterministic confidence in [0,1]. AST facts are 1; inferred facts are lower. */
  readonly confidence: number;
}

/** A single compiled artifact (file or external spec) that produced IR facts. */
export interface ArtifactIR {
  readonly id: string;
  readonly kind: ArtifactKind;
  readonly path: string;
  readonly language: string | null;
  /** Content hash for incremental compilation / cache invalidation. */
  readonly hash: string;
}

// ---------------------------------------------------------------------------
// Repository IR graph
// ---------------------------------------------------------------------------

/** A node in the Repository IR. Identity is canonical and stable. */
export interface NodeIR {
  readonly id: string;
  readonly kind: NodeKind;
  readonly name: string;
  readonly language: string | null;
  readonly artifactId: string;
  readonly span: Span | null;
  /** Content hash of the node's own span, for incremental rebuilds. */
  readonly hash: string;
  /** Execution facts populated by the Reachability / Runtime / Test passes. */
  readonly execution: ExecutionFacts;
  readonly evidence: readonly EvidenceIR[];
}

/** Execution-related facts attached to a node. */
export interface ExecutionFacts {
  readonly reachable: boolean;
  /** Distance from the nearest entrypoint; null when unreachable. */
  readonly entryDistance: number | null;
  readonly runtimeObserved: boolean;
  readonly tested: boolean;
}

/** A directed, evidence-backed edge in the Repository IR. */
export interface EdgeIR {
  readonly id: string;
  readonly kind: EdgeKind;
  readonly from: string;
  readonly to: string;
  readonly evidence: readonly EvidenceIR[];
}

// ---------------------------------------------------------------------------
// Capabilities & constraints
// ---------------------------------------------------------------------------

/** A typed constraint on a capability (e.g. OTP_CHANNEL = EMAIL). */
export interface ConstraintIR {
  readonly key: string;
  readonly value: string;
  readonly evidence: readonly EvidenceIR[];
}

/** A capability instance discovered in the repository, bound to ontology ids. */
export interface CapabilityIR {
  readonly id: string;
  /** Ontology feature id, e.g. "AUTH". */
  readonly feature: string;
  /** Ontology capability id, e.g. "AUTH.LOGIN". */
  readonly capability: string;
  readonly constraints: readonly ConstraintIR[];
  /** Node ids that participate in this capability's implementation. */
  readonly nodes: readonly string[];
  readonly closure: ClosureState;
  readonly evidence: readonly EvidenceIR[];
}

// ---------------------------------------------------------------------------
// Repository IR aggregate + snapshot
// ---------------------------------------------------------------------------

/** The full Repository IR for one compilation of one repository. */
export interface RepositoryIR {
  readonly version: typeof RIR_VERSION;
  readonly nodes: readonly NodeIR[];
  readonly edges: readonly EdgeIR[];
  readonly artifacts: readonly ArtifactIR[];
  readonly capabilities: readonly CapabilityIR[];
}

/** An immutable, content-addressed snapshot of a Repository IR. */
export interface SnapshotIR {
  readonly id: string;
  readonly createdAt: string;
  readonly repositoryHash: string;
  readonly ir: RepositoryIR;
}

// ---------------------------------------------------------------------------
// Requirement IR (documents normalized into facts, never prose)
// ---------------------------------------------------------------------------

/** A single normalized requirement fact extracted from a document. */
export interface RequirementIR {
  readonly id: string;
  readonly feature: string;
  readonly capability: string;
  readonly constraints: readonly ConstraintIR[];
  readonly outputs: readonly string[];
  readonly priority: Priority;
  readonly evidence: readonly EvidenceIR[];
}

/** The aggregate of all requirement facts compiled from documents. */
export interface RequirementSet {
  readonly version: typeof REQUIREMENT_IR_VERSION;
  readonly requirements: readonly RequirementIR[];
}

// ---------------------------------------------------------------------------
// Deterministic guards & helpers (no inference, no external deps)
// ---------------------------------------------------------------------------

const NODE_KINDS = new Set<string>(Object.values(NodeKind));
const EDGE_KINDS = new Set<string>(Object.values(EdgeKind));
const CLOSURE_STATES = new Set<string>(Object.values(ClosureState));

export function isNodeKind(value: string): value is NodeKind {
  return NODE_KINDS.has(value);
}

export function isEdgeKind(value: string): value is EdgeKind {
  return EDGE_KINDS.has(value);
}

export function isClosureState(value: string): value is ClosureState {
  return CLOSURE_STATES.has(value);
}

export function emptyRepositoryIR(): RepositoryIR {
  return { version: RIR_VERSION, nodes: [], edges: [], artifacts: [], capabilities: [] };
}

export function emptyRequirementSet(): RequirementSet {
  return { version: REQUIREMENT_IR_VERSION, requirements: [] };
}

export { serializeRepositoryIR, parseRepositoryIR } from "./serializer.js";
export { validateRepositoryIR } from "./validator.js";
