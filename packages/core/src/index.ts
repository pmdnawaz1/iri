/**
 * @rir/core — Compiler interfaces, pipeline, plugin registry, DI.
 *
 * Nothing domain-specific lives here. These contracts (owned by the high-reasoning
 * AI) define HOW artifacts are compiled into the Repository IR; the concrete
 * builders, passes, and adapters are implemented in their own packages against
 * these interfaces. Builder ordering and the pipeline shape are architectural and
 * must not be changed by implementers.
 */

import type { ArtifactIR, RepositoryIR } from "@rir/ir";

/** Immutable inputs handed to every pass during one compilation. */
export interface CompilationContext {
  readonly repositoryRoot: string;
  readonly artifacts: readonly ArtifactIR[];
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

/** Mutable accumulator used while compiling; sealed into an immutable RepositoryIR. */
export interface IRDraft {
  addNode(node: RepositoryIR["nodes"][number]): void;
  addEdge(edge: RepositoryIR["edges"][number]): void;
  addArtifact(artifact: ArtifactIR): void;
  addCapability(capability: RepositoryIR["capabilities"][number]): void;
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
