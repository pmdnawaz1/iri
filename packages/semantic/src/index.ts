/**
 * @rir/semantic — Semantic Projection Layer (the ONLY package allowed to call an LLM).
 *
 * It READS a Repository IR subgraph and produces disposable explanations. It NEVER
 * writes to the IR, never participates in compilation, closure, coverage, or
 * consistency. All outputs are summaries — never canonical facts.
 */

import type { Subgraph } from "@rir/query-engine";

/** A disposable, human-facing explanation generated from an IR subgraph. */
export interface Explanation {
  readonly question: string;
  readonly text: string;
  /** Node ids the explanation was grounded on, for traceability. */
  readonly groundedOn: readonly string[];
}

/** Abstraction over an LLM. Implementations live outside the compiler core. */
export interface LanguageModel {
  complete(prompt: string): Promise<string>;
}

/** Projects an IR subgraph + question into a grounded prompt, then an Explanation. */
export class SemanticProjector {
  constructor(private readonly model: LanguageModel) {}

  /** Build the deterministic, IR-grounded prompt (no IR mutation). */
  buildPrompt(question: string, subgraph: Subgraph): string {
    const nodes = subgraph.nodes.map((n) => `- ${n.kind} ${n.name} (${n.id})`).join("\n");
    const edges = subgraph.edges.map((e) => `- ${e.from} --${e.kind}--> ${e.to}`).join("\n");
    return [
      "You are explaining software using ONLY the canonical facts below.",
      "Do not invent facts beyond this subgraph.",
      "",
      `Question: ${question}`,
      "",
      "Nodes:",
      nodes,
      "",
      "Edges:",
      edges,
    ].join("\n");
  }

  async explain(question: string, subgraph: Subgraph): Promise<Explanation> {
    const text = await this.model.complete(this.buildPrompt(question, subgraph));
    return { question, text, groundedOn: subgraph.nodes.map((n) => n.id) };
  }
}
