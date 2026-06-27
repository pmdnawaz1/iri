import type { ArtifactIR } from "@rir/ir";
import { hash64, makeId } from "@rir/common";
import type { DocumentFrontend, DocumentStructure, ExtractedStatement } from "./index.js";

/**
 * MarkdownFrontend (TSPEC-DF01). Extracts STRUCTURE only — heading hierarchy and the
 * statements (paragraphs / list items) under each heading. No business interpretation;
 * the RequirementNormalizer (ADR-0017) maps statements to facts.
 */
export class MarkdownFrontend implements DocumentFrontend {
  readonly format = "markdown";

  supports(path: string): boolean {
    return path.endsWith(".md") || path.endsWith(".markdown");
  }

  extract(path: string, content: string): DocumentStructure {
    const headings: string[] = [];
    const statements: ExtractedStatement[] = [];
    const section: string[] = []; // current heading path (index 0 = h1 …)
    let ordinal = 0;

    for (const raw of content.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;

      const heading = /^(#{1,6})\s+(.*)$/.exec(line);
      if (heading) {
        const level = heading[1]!.length;
        const title = heading[2]!.trim();
        headings.push(title);
        section.length = level - 1; // pop deeper levels
        section[level - 1] = title;
        continue;
      }

      // statement: a list item or a paragraph line. Strip list/quote markers.
      const text = line.replace(/^([-*+]|\d+\.|>)\s+/, "").trim();
      if (!text || text.startsWith("```") || text.startsWith("|")) continue;
      ordinal += 1;
      statements.push({ text, section: section.filter(Boolean), ordinal });
    }

    const artifact: ArtifactIR = {
      id: makeId("art", path),
      kind: "DOCUMENT",
      path,
      language: null,
      hash: hash64(content),
    };
    return { artifact, headings, statements };
  }
}
