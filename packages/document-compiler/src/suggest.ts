/**
 * Deterministic BM25 alias suggester (proposal-only). For every documented requirement-like
 * statement the lexical resolver could NOT place (an UNMAPPED statement), rank the existing
 * ontology capabilities by Okapi BM25 over their lexical profile and surface the best matches.
 *
 * This is the cheap first tier of the document-evolution seam, but it stays DETERMINISTIC and
 * in-repo: pure arithmetic over the fixed ontology + statement text, no model, no network,
 * reproducible across runs. It NEVER maps a statement (that would corrupt the truth path) and
 * NEVER edits the ontology — it only suggests "this statement most resembles AUTH.LOGIN; if it
 * means that, add an alias". A human turns a suggestion into an ontology change + ADR.
 */

import { allCapabilities, type CapabilityDefinition } from "@rir/ontology";
import type { DocumentStructure } from "./index.js";
import { isRequirementLike, resolveCapability } from "./normalizer.js";

const K1 = 1.5;
const B = 0.75;

// Generic requirement/glue words carry no discriminating signal — drop them from queries.
const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "to",
  "of",
  "for",
  "and",
  "or",
  "in",
  "on",
  "by",
  "with",
  "as",
  "is",
  "are",
  "be",
  "via",
  "their",
  "they",
  "them",
  "it",
  "its",
  "this",
  "that",
  "every",
  "each",
  "all",
  "any",
  "system",
  "user",
  "users",
  "product",
  "application",
  "app",
  "service",
  "must",
  "shall",
  "should",
  "will",
  "can",
  "able",
  "allow",
  "allows",
  "support",
  "supports",
  "enable",
  "enables",
  "require",
  "requires",
  "provide",
  "provides",
  "return",
  "returns",
  "using",
  "use",
  "new",
  "request",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** The lexical profile of a capability: every word the ontology associates with it. */
function profileTokens(cap: CapabilityDefinition): string[] {
  const raw = [
    ...cap.id.split(/[._]/),
    ...cap.name.split("_"),
    ...cap.aliases.flatMap((a) => a.split(/[^a-zA-Z0-9]+/)),
    ...cap.outputs,
    ...cap.constraints.flatMap((c) => c.key.split("_")),
  ];
  return raw.map((t) => t.toLowerCase()).filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

interface Bm25Index {
  readonly caps: readonly CapabilityDefinition[];
  readonly docs: readonly Map<string, number>[]; // term -> freq, per capability
  readonly lengths: readonly number[];
  readonly idf: ReadonlyMap<string, number>;
  readonly avgdl: number;
}

function buildIndex(): Bm25Index {
  const caps = allCapabilities();
  const docs = caps.map((c) => {
    const tf = new Map<string, number>();
    for (const t of profileTokens(c)) tf.set(t, (tf.get(t) ?? 0) + 1);
    return tf;
  });
  const lengths = docs.map((d) => [...d.values()].reduce((a, b) => a + b, 0));
  const avgdl = lengths.reduce((a, b) => a + b, 0) / (lengths.length || 1);

  const df = new Map<string, number>();
  for (const d of docs) for (const t of d.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const n = docs.length;
  const idf = new Map<string, number>();
  for (const [t, freq] of df) idf.set(t, Math.log(1 + (n - freq + 0.5) / (freq + 0.5)));

  return { caps, docs, lengths, idf, avgdl };
}

function score(
  index: Bm25Index,
  docIdx: number,
  queryTerms: readonly string[],
): { score: number; matched: string[] } {
  const doc = index.docs[docIdx]!;
  const dl = index.lengths[docIdx]!;
  let s = 0;
  const matched: string[] = [];
  for (const t of new Set(queryTerms)) {
    const f = doc.get(t);
    if (!f) continue;
    const idf = index.idf.get(t) ?? 0;
    s += (idf * (f * (K1 + 1))) / (f + K1 * (1 - B + (B * dl) / index.avgdl));
    matched.push(t);
  }
  return { score: s, matched: matched.sort() };
}

export interface AliasSuggestion {
  /** The documented statement that did not resolve. */
  readonly statement: string;
  readonly section: readonly string[];
  /** `path#ordinal` provenance back to the document. */
  readonly locator: string;
  /** Best-matching capabilities, highest BM25 first. Empty if nothing scored. */
  readonly candidates: readonly {
    readonly capability: string;
    readonly score: number;
    /** Which query terms hit this capability's profile — reveals weak single-token matches. */
    readonly matched: readonly string[];
  }[];
}

export interface SuggestOptions {
  /** Minimum BM25 score for a candidate to be reported. Default 0.5. */
  readonly minScore?: number;
  /** Max candidates per statement. Default 3. */
  readonly top?: number;
}

/**
 * Rank ontology capabilities for each UNMAPPED requirement-like statement. Deterministic:
 * ordering is by score desc, ties broken by capability id asc.
 */
export function suggestAliases(
  structures: readonly DocumentStructure[],
  opts: SuggestOptions = {},
): AliasSuggestion[] {
  const minScore = opts.minScore ?? 0.5;
  const top = opts.top ?? 3;
  const index = buildIndex();
  const out: AliasSuggestion[] = [];

  for (const struct of structures) {
    const alwaysRequirement = struct.artifact.kind === "API_SPEC";
    for (const stmt of struct.statements) {
      // Only statements the deterministic resolver missed, that look like requirements.
      if (!alwaysRequirement && !isRequirementLike(stmt.text)) continue;
      if (resolveCapability(stmt.section, stmt.text)) continue;

      const queryTerms = tokenize([...stmt.section, stmt.text].join(" "));
      if (queryTerms.length === 0) continue;

      const ranked = index.caps
        .map((c, i) => {
          const { score: sc, matched } = score(index, i, queryTerms);
          return { capability: c.id, score: sc, matched };
        })
        .filter((r) => r.score >= minScore)
        .sort((a, b) => b.score - a.score || a.capability.localeCompare(b.capability))
        .slice(0, top)
        .map((r) => ({ capability: r.capability, score: Number(r.score.toFixed(4)), matched: r.matched }));

      out.push({
        statement: stmt.text,
        section: stmt.section,
        locator: `${struct.artifact.path}#${stmt.ordinal}`,
        candidates: ranked,
      });
    }
  }
  return out;
}
