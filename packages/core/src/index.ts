/**
 * @rir/core — Compiler interfaces, pipeline, plugin registry, DI.
 *
 * Nothing domain-specific lives here. These contracts (owned by the high-reasoning
 * AI) define HOW artifacts are compiled into the Repository IR; the concrete
 * builders, passes, and adapters are implemented in their own packages against
 * these interfaces. Builder ordering and the pipeline shape are architectural and
 * must not be changed by implementers.
 */

import type { ArtifactIR, CapabilityIR, EdgeIR, NodeIR, RepositoryIR, Span } from "@rir/ir";

// ---------------------------------------------------------------------------
// Frontend facts — the canonical, NON-semantic output of a language adapter.
// Defined here (not in @rir/code-compiler) so both adapters AND passes can share
// the contract without a circular dependency. Adapters produce these; the early
// passes lift them into IR nodes/edges. See ADR-0016.
// ---------------------------------------------------------------------------

/** A raw symbol declared in a source file (syntactic; no role classification). */
export interface SymbolFact {
  readonly name: string;
  readonly kind: "function" | "class" | "method" | "variable" | "type" | "interface";
  readonly exported: boolean;
  readonly span: Span;
}

/** A raw import as written in source (unresolved). */
export interface ImportFact {
  readonly specifier: string;
  readonly imported: readonly string[];
  readonly span: Span;
}

/** A raw call site (callee text as written, unresolved). */
export interface CallFact {
  readonly callee: string;
  /**
   * Name of the nearest enclosing named declaration (class or function) that contains
   * this call — the SOURCE of the resulting CALLS edge. Optional for backward
   * compatibility; adapters populate it in a later enhancement. Absent ⇒ no edge.
   */
  readonly enclosing?: string;
  readonly span: Span;
}

/** A route declaration discovered syntactically (no semantic mapping). */
export interface RouteFact {
  readonly method: string;
  readonly path: string;
  readonly handler: string;
  readonly span: Span;
}

/** The canonical, non-semantic result of parsing one file. */
export interface ParseResult {
  readonly artifact: ArtifactIR;
  readonly symbols: readonly SymbolFact[];
  readonly imports: readonly ImportFact[];
  readonly exports: readonly string[];
  readonly calls: readonly CallFact[];
  readonly routes: readonly RouteFact[];
}

/** Immutable inputs handed to every pass during one compilation. */
export interface CompilationContext {
  readonly repositoryRoot: string;
  readonly artifacts: readonly ArtifactIR[];
  /**
   * Frontend parse results for the repository, produced by the language adapters
   * before any pass runs. The early passes (Import/Call/Route…) lift these facts
   * into IR nodes and edges. Optional because it is absent during the frontend
   * (adapter) phase and populated for the pass phase; passes read `?? []`.
   */
  readonly parseResults?: readonly ParseResult[];
  /** Structured logger; passes log but never alter outputs through logging. */
  readonly logger: Logger;
}

/** Minimal structured logger contract (implemented in @rir/common). */
export interface Logger {
  debug(msg: string, fields?: Record<string, unknown>): void;
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  error(msg: string, fields?: Record<string, unknown>): void;
  child(fields: Record<string, unknown>): Logger;
}

/**
 * A compiler pass. Each pass owns exactly one responsibility, is deterministic and
 * idempotent, and contributes facts to a mutable IR draft. Passes communicate ONLY
 * through the IR — never through hidden shared state.
 */
export interface Pass {
  readonly name: string;
  /** Lower runs earlier. Ordering is architectural; do not change to "fix" a bug. */
  readonly priority: number;
  /** Whether this pass applies to the given context (e.g. language present). */
  supports(ctx: CompilationContext): boolean;
  run(ctx: CompilationContext, draft: IRDraft): void | Promise<void>;
}

/** A builder groups one or more passes for a coherent concern (imports, routes…). */
export interface Builder {
  readonly name: string;
  readonly priority: number;
  supports(ctx: CompilationContext): boolean;
  passes(): readonly Pass[];
}

/**
 * Mutable accumulator used while compiling; sealed into an immutable RepositoryIR.
 *
 * Writes are idempotent by id (re-adding a node/edge with the same id replaces it),
 * so multiple passes may contribute the same vertex without conflict. READ access is
 * required so a later pass can consume an earlier pass's output (e.g. ReachabilityPass
 * reading the nodes/edges produced by Call/Route passes). See ADR-0006 / ADR-0016.
 */
export interface IRDraft {
  addNode(node: NodeIR): void;
  addEdge(edge: EdgeIR): void;
  addArtifact(artifact: ArtifactIR): void;
  addCapability(capability: CapabilityIR): void;
  /** Snapshot of nodes added so far (read access for later passes). */
  getNodes(): readonly NodeIR[];
  /** Snapshot of edges added so far. */
  getEdges(): readonly EdgeIR[];
  /** A single node by id, or undefined. */
  getNode(id: string): NodeIR | undefined;
  /** Snapshot of capabilities added so far. */
  getCapabilities(): readonly CapabilityIR[];
  seal(): RepositoryIR;
}

/** The top-level compiler: artifacts in, Repository IR out. */
export interface Compiler {
  compile(ctx: CompilationContext): Promise<RepositoryIR>;
}

/** Registry of builders. Plugins register here instead of language-specific hacks. */
export class PluginRegistry {
  private readonly builders: Builder[] = [];

  register(builder: Builder): this {
    this.builders.push(builder);
    return this;
  }

  /** Builders applicable to the context, sorted by ascending priority (stable). */
  resolve(ctx: CompilationContext): readonly Builder[] {
    return this.builders
      .filter((b) => b.supports(ctx))
      .map((b, index) => ({ b, index }))
      .sort((x, y) => x.b.priority - y.b.priority || x.index - y.index)
      .map(({ b }) => b);
  }

  /** Flattened, ordered pass list across all applicable builders. */
  resolvePasses(ctx: CompilationContext): readonly Pass[] {
    return this.resolve(ctx)
      .flatMap((b) => b.passes())
      .map((p, index) => ({ p, index }))
      .sort((x, y) => x.p.priority - y.p.priority || x.index - y.index)
      .map(({ p }) => p);
  }
}

/** Tiny token-based DI container; avoids framework lock-in. */
export class Container {
  private readonly factories = new Map<symbol, () => unknown>();
  private readonly singletons = new Map<symbol, unknown>();

  register<T>(token: symbol, factory: () => T): this {
    this.factories.set(token, factory);
    return this;
  }

  resolve<T>(token: symbol): T {
    if (this.singletons.has(token)) return this.singletons.get(token) as T;
    const factory = this.factories.get(token);
    if (!factory) throw new Error(`No provider registered for token: ${token.toString()}`);
    const value = factory();
    this.singletons.set(token, value);
    return value as T;
  }
}
