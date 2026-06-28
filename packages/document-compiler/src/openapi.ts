import { parse as parseYaml } from "yaml";
import type { ArtifactIR } from "@rir/ir";
import { hash64, makeId } from "@rir/common";
import type { DocumentFrontend, DocumentStructure, ExtractedStatement } from "./index.js";

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "options", "head", "trace"] as const;

interface OpenApiOperation {
  readonly summary?: string;
  readonly description?: string;
  readonly operationId?: string;
  readonly tags?: readonly string[];
}
type OpenApiPathItem = Partial<Record<(typeof HTTP_METHODS)[number], OpenApiOperation>>;
interface OpenApiDocument {
  readonly openapi?: string;
  readonly swagger?: string;
  readonly paths?: Record<string, OpenApiPathItem>;
}

/** Split camelCase / snake_case / path punctuation into space-separated words. */
function humanize(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[/{}._-]+/g, " ")
    .trim();
}

/**
 * OpenApiFrontend (TSPEC-DF02). Each operation (path + method) is a near-requirement: its
 * summary/operationId/tags/path become a statement the RequirementNormalizer maps to an
 * ontology capability. Structure only — no business interpretation. YAML or JSON (YAML is a
 * JSON superset, so one parser covers both).
 */
export class OpenApiFrontend implements DocumentFrontend {
  readonly format = "openapi";

  supports(path: string): boolean {
    const lower = path.toLowerCase();
    return /(openapi|swagger)\.(ya?ml|json)$/.test(lower);
  }

  extract(path: string, content: string): DocumentStructure {
    const doc = (parseYaml(content) ?? {}) as OpenApiDocument;
    const headings = new Set<string>();
    const statements: ExtractedStatement[] = [];
    let ordinal = 0;

    for (const [route, item] of Object.entries(doc.paths ?? {})) {
      const firstSegment = route.split("/").filter(Boolean)[0] ?? "root";
      for (const method of HTTP_METHODS) {
        const op = item[method];
        if (!op) continue;

        const section = (op.tags && op.tags.length ? [...op.tags] : [firstSegment]).map(humanize);
        for (const h of section) headings.add(h);

        // The verb+path always; summary/description/operationId add the domain words
        // (camel-split) the normalizer needs to resolve a capability.
        const parts = [
          op.summary,
          op.description,
          humanize(op.operationId ?? ""),
          `${method.toUpperCase()} ${humanize(route)}`,
        ].filter((p): p is string => Boolean(p && p.trim()));

        ordinal += 1;
        statements.push({ text: parts.join(". "), section, ordinal });
      }
    }

    const artifact: ArtifactIR = {
      id: makeId("art", path),
      kind: "API_SPEC",
      path,
      language: null,
      hash: hash64(content),
    };
    return { artifact, headings: [...headings], statements };
  }
}
