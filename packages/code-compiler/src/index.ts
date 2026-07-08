/**
 * @rir/code-compiler — Code frontends.
 *
 * Owns the LanguageAdapter contract. Adapters parse source via Tree-sitter and emit
 * canonical, NON-semantic facts (symbols, imports, exports, types, calls, routes).
 * Concrete per-language adapters (typescript, python, go…) are low-reasoning
 * implementation tasks that satisfy this contract. No adapter interprets meaning.
 */

import type { CompilationContext, ParseResult } from "@rir/core";

// The frontend fact types are defined in @rir/core (so passes can share them) and
// re-exported here so adapters keep importing them from the code-compiler barrel.
export type { SymbolFact, ImportFact, CallFact, RouteFact, ParseResult } from "@rir/core";

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
export { PythonAdapter } from "./language/python.js";
export { JavaAdapter } from "./language/java.js";
export { GoAdapter } from "./language/go.js";
export { RustAdapter } from "./language/rust.js";
export { CSharpAdapter } from "./language/csharp.js";
export { CSSAdapter } from "./language/css.js";
export { PrismaAdapter } from "./language/prisma.js";
