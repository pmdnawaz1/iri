/**
 * CallPass — TSPEC-P02
 *
 * Lifts ParseResult symbols into IR declaration nodes (classified) and CallFacts
 * into CALLS edges. Deterministic, non-semantic beyond the fixed classification rule.
 * Per ADR-0016.
 */

import type { CompilationContext, IRDraft, SymbolFact } from "@rir/core";
import type { NodeKind } from "@rir/ir";
import { makeId } from "@rir/common";
import { AbstractPass, PASS_PRIORITY } from "./base.js";

function classify(sym: SymbolFact): NodeKind {
  if (sym.kind === "class") {
    if (sym.name.endsWith("Controller")) return "CONTROLLER";
    if (sym.name.endsWith("Service")) return "SERVICE";
    if (sym.name.endsWith("Repository")) return "REPOSITORY";
    return "CLASS";
  }
  if (sym.kind === "function") return "FUNCTION";
  if (sym.kind === "method") return "METHOD";
  if (sym.kind === "interface") return "INTERFACE";
  if (sym.kind === "type") return "TYPE";
  if (sym.kind === "variable") return "VARIABLE";
  return "CLASS";
}

export class CallPass extends AbstractPass {
  readonly name = "CallPass" as const;

  override get priority(): number {
    return PASS_PRIORITY.CallPass;
  }

  override supports(): boolean {
    return true;
  }

  override run(ctx: CompilationContext, draft: IRDraft): void {
    // Phase 1 — declaration nodes (all files first, so cross-file calls resolve)
    for (const pr of ctx.parseResults ?? []) {
      draft.addArtifact(pr.artifact);

      for (const sym of pr.symbols) {
        draft.addNode({
          id: makeId("decl", sym.name),
          kind: classify(sym),
          name: sym.name,
          language: pr.artifact.language,
          artifactId: pr.artifact.id,
          span: sym.span,
          hash: "0",
          execution: {
            reachable: false,
            entryDistance: null,
            runtimeObserved: false,
            tested: false,
          },
          evidence: [
            {
              source: "AST",
              locator: pr.artifact.path,
              confidence: 1,
            },
          ],
        });
      }
    }

    // Phase 2 — CALLS edges
    for (const pr of ctx.parseResults ?? []) {
      for (const call of pr.calls) {
        if (!call.enclosing) continue;

        const from = makeId("decl", call.enclosing);
        if (!draft.getNode(from)) continue;

        // Resolve target: split callee on ".", find the first non-"this" segment
        // as the receiver whose class name we capitalize to get the target.
        // e.g. "this.authService.login" → receiver = "authService" → "AuthService"
        const segments = call.callee.split(".");
        // Drop the last segment (the method name), keep the rest as receiver segments
        const receiverSegments = segments.slice(0, -1).filter((s) => s !== "this");
        if (receiverSegments.length === 0) continue;

        const receiver = receiverSegments[receiverSegments.length - 1];
        if (!receiver) continue;

        // Capitalize first letter to get target class name
        const targetClass = receiver.charAt(0).toUpperCase() + receiver.slice(1);
        const to = makeId("decl", targetClass);

        if (!draft.getNode(to)) continue;

        draft.addEdge({
          id: makeId("edge", "calls", from, to),
          kind: "CALLS",
          from,
          to,
          evidence: [
            {
              source: "AST",
              locator: pr.artifact.path,
              confidence: 1,
            },
          ],
        });
      }
    }
  }
}
