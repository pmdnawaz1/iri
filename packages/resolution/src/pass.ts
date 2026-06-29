import type { Pass, CompilationContext, IRDraft } from "@rir/core";
import { MemoryQueryBuilder, type UnresolvedReference } from "./memory-queries.js";
import { ReferenceResolver } from "./resolver.js";
import { makeId } from "@rir/common";

/**
 * ResolutionPass (TSPEC-F13) — the deep call graph. Routes are emitted by the language
 * adapters (RoutePass) and linked to controllers by RoutePass; this pass adds the
 * cross-file CALLS edges that name-matching inside a single file cannot, so a capability's
 * controller -> service -> repository chain actually connects in the IR. Pure: it only ADDS
 * resolved edges via the in-memory query shim; it never removes nodes or edges.
 */
export class ResolutionPass implements Pass {
  readonly name = "ResolutionPass" as const;
  readonly priority = 15;

  supports(_ctx: CompilationContext): boolean {
    return true;
  }

  async run(ctx: CompilationContext, draft: IRDraft): Promise<void> {
    const unresolvedRefs: UnresolvedReference[] = [];
    let idCounter = 0;

    // One unresolved "calls" reference per CallFact, from the enclosing declaration node.
    for (const pr of ctx.parseResults ?? []) {
      for (const call of pr.calls) {
        if (!call.enclosing) continue;
        unresolvedRefs.push({
          id: `ref-${idCounter++}`,
          fromNodeId: makeId("decl", call.enclosing),
          referenceName: call.callee,
          referenceKind: "calls",
          line: call.span?.startLine ?? 0,
          column: call.span?.startColumn ?? 0,
          filePath: pr.artifact.path,
          language: pr.artifact.language ?? "",
        });
      }
    }

    const queries = new MemoryQueryBuilder(draft, unresolvedRefs);
    const resolver = new ReferenceResolver(ctx.repositoryRoot, queries as never);
    await resolver.resolveAndPersistBatched();
  }
}
