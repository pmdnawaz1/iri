import type { LanguageAdapter, ParseResult, SymbolFact } from "../index.js";
import type { CompilationContext } from "@rir/core";
import type { ArtifactIR } from "@rir/ir";
import { hash64 } from "@rir/common";

export class PrismaAdapter implements LanguageAdapter {
  readonly language = "prisma";
  readonly extensions = [".prisma"];

  supports(path: string): boolean {
    return this.extensions.some((ext) => path.endsWith(ext));
  }

  parse(path: string, source: string, _ctx: CompilationContext): ParseResult {
    const artifact: ArtifactIR = {
      id: `artifact|${path}`,
      kind: "CODE",
      path,
      language: "prisma",
      hash: hash64(source),
    };
    return {
      artifact,
      symbols: extractPrismaModels(source),
      imports: [],
      exports: [],
      calls: [],
      routes: [],
      controlFlows: [],
      source,
    };
  }
}

function extractPrismaModels(source: string): SymbolFact[] {
  const symbols: SymbolFact[] = [];
  const lines = source.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const modelMatch = line.match(/^\s*(model|enum|type)\s+(\w+)\s*\{/);
    if (modelMatch) {
      const kind = modelMatch[1]!;
      const name = modelMatch[2]!;
      const startLine = i + 1;
      let depth = 1;
      const blockLines: string[] = [line];
      let endLine = startLine;
      while (endLine < lines.length && depth > 0) {
        endLine++;
        if (endLine <= lines.length) {
          const next = lines[endLine - 1]!;
          blockLines.push(next);
          depth += (next.match(/{/g) || []).length;
          depth -= (next.match(/}/g) || []).length;
        }
      }
      const snippet = blockLines.join("\n");
      symbols.push({
        name,
        kind: kind === "enum" ? "enum" : "class",
        exported: true,
        span: { startLine, endLine, startColumn: 0, endColumn: 0 },
        sourceText: snippet.length > 2000 ? snippet.slice(0, 2000) + "\n// ..." : snippet,
        docstring: `Prisma ${kind}: ${name}`,
      });
      i = endLine;
    } else {
      i++;
    }
  }
  return symbols;
}
