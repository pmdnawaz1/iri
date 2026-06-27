/**
 * @rir/code-compiler — Code frontends.
 *
 * Owns the LanguageAdapter contract. Adapters parse source via Tree-sitter and emit
 * canonical, NON-semantic facts (symbols, imports, exports, types, calls, routes).
 * Concrete per-language adapters (typescript, python, go…) are low-reasoning
 * implementation tasks that satisfy this contract. No adapter interprets meaning.
 */

import type { CompilationContext } from "@rir/core";
import type { ArtifactIR, Span } from "@rir/ir";

/** A raw symbol declared in a source file. */
export interface SymbolFact {
  readonly name: string;
  readonly kind: "function" | "class" | "method" | "variable" | "type" | "interface";
  readonly exported: boolean;
  readonly span: Span;
}

/** A raw import edge as written in source (unresolved). */
export interface ImportFact {
  readonly specifier: string;
  readonly imported: readonly string[];
  readonly span: Span;
}

/** A raw call site (callee text as written, unresolved). */
export interface CallFact {
  readonly callee: string;
  readonly span: Span;
}

/** A route declaration discovered syntactically (no semantic mapping). */
export interface RouteFact {
  readonly method: string;
  readonly path: string;
  readonly handler: string;
  readonly span: Span;
}

/** The canonical, non-semantic output of parsing one file. */
export interface ParseResult {
  readonly artifact: ArtifactIR;
  readonly symbols: readonly SymbolFact[];
  readonly imports: readonly ImportFact[];
  readonly exports: readonly string[];
  readonly calls: readonly CallFact[];
  readonly routes: readonly RouteFact[];
}

/** Contract every language adapter must satisfy. Purely syntactic. */
export interface LanguageAdapter {
  readonly language: string;
  /** File extensions this adapter claims, e.g. [".ts", ".tsx"]. */
  readonly extensions: readonly string[];
  supports(path: string): boolean;
  parse(path: string, source: string, ctx: CompilationContext): ParseResult;
}

/** Registry that selects an adapter by file path. */
export class AdapterRegistry {
  private readonly adapters: LanguageAdapter[] = [];

  register(adapter: LanguageAdapter): this {
    this.adapters.push(adapter);
    return this;
  }

  select(path: string): LanguageAdapter | undefined {
    return this.adapters.find((a) => a.supports(path));
  }
}

export { TypeScriptAdapter, extractParseResult } from "./language/typescript.js";
export { JavaScriptAdapter } from "./language/javascript.js";
export { CSharpAdapter } from "./language/csharp.js";
