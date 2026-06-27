/**
 * @rir/document-compiler — Document frontends.
 *
 * Compiles documents (markdown, pdf, docx, openapi, asyncapi, json-schema) into the
 * Requirement IR. Frontends extract STRUCTURE only (headings, tables, statements);
 * they never interpret business meaning. The statement -> Requirement normalization
 * rules are architect-owned and applied by the requirement-normalizer, optionally
 * assisted by the (isolated) semantic layer. No document frontend writes prose into
 * the IR as truth.
 */

import type { ArtifactIR, RequirementSet } from "@rir/ir";

/** A structural statement extracted from a document (still natural language). */
export interface ExtractedStatement {
  readonly text: string;
  /** Heading path the statement appears under, e.g. ["Auth", "Login"]. */
  readonly section: readonly string[];
  /** 1-based ordinal within the document for stable provenance. */
  readonly ordinal: number;
}

/** Structure-only output of a document frontend. */
export interface DocumentStructure {
  readonly artifact: ArtifactIR;
  readonly headings: readonly string[];
  readonly statements: readonly ExtractedStatement[];
}

/** Contract for a document frontend. Structure extraction only. */
export interface DocumentFrontend {
  readonly format: string;
  supports(path: string): boolean;
  extract(path: string, content: string): DocumentStructure;
}

/**
 * Normalizes extracted statements into the Requirement IR. The normalization rules
 * are architectural; implementations apply them deterministically and must escalate
 * (never guess) when a statement maps to no ontology capability/constraint.
 */
export interface RequirementNormalizer {
  normalize(structures: readonly DocumentStructure[]): RequirementSet;
}

/** Registry selecting a frontend by document path. */
export class FrontendRegistry {
  private readonly frontends: DocumentFrontend[] = [];

  register(frontend: DocumentFrontend): this {
    this.frontends.push(frontend);
    return this;
  }

  select(path: string): DocumentFrontend | undefined {
    return this.frontends.find((f) => f.supports(path));
  }
}
