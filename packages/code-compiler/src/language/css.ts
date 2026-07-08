import type { LanguageAdapter, ParseResult, SymbolFact } from "../index.js";
import type { CompilationContext } from "@rir/core";
import type { ArtifactIR } from "@rir/ir";
import { hash64 } from "@rir/common";

export class CSSAdapter implements LanguageAdapter {
  readonly language = "css";
  readonly extensions = [".css", ".scss", ".sass"];

  supports(path: string): boolean {
    return this.extensions.some((ext) => path.endsWith(ext));
  }

  parse(path: string, source: string, _ctx: CompilationContext): ParseResult {
    const artifact: ArtifactIR = {
      id: `artifact|${path}`,
      kind: "CODE",
      path,
      language: "css",
      hash: hash64(source),
    };
    return {
      artifact,
      symbols: extractCSSSymbols(source),
      imports: [],
      exports: [],
      calls: [],
      routes: [],
      controlFlows: [],
      source,
    };
  }
}

function extractCSSSymbols(source: string): SymbolFact[] {
  const symbols: SymbolFact[] = [];
  const lines = source.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("/*") || trimmed.startsWith("//") || trimmed.startsWith("*")) {
      i++;
      continue;
    }
    const braceIdx = line.indexOf("{");
    if (braceIdx >= 0) {
      const selector = line.slice(0, braceIdx).trim();
      const startLine = i + 1;
      let endLine = startLine;
      let depth = 1;
      const ruleLines: string[] = [line];
      while (endLine < lines.length && depth > 0) {
        endLine++;
        if (endLine <= lines.length) {
          const nextLine = lines[endLine - 1]!;
          ruleLines.push(nextLine);
          depth += (nextLine.match(/{/g) || []).length;
          depth -= (nextLine.match(/}/g) || []).length;
        }
      }
      if (selector) {
        const snippet = ruleLines.join("\n");
        symbols.push({
          name: selector.split(",").map((s) => s.trim()).join(", "),
          kind: "property",
          exported: false,
          span: { startLine, endLine, startColumn: 0, endColumn: 0 },
          sourceText: snippet.length > 2000 ? snippet.slice(0, 2000) + "\n/* ... */" : snippet,
        });
      }
      i = endLine;
    } else {
      i++;
    }
  }
  return symbols;
}
