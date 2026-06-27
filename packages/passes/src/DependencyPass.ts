import { AbstractPass, PASS_PRIORITY } from "./base.js";
import { makeId } from "@rir/common";
import type { IRDraft, CompilationContext } from "@rir/core";
import type { EdgeIR } from "@rir/ir";

export class DependencyPass extends AbstractPass {
  override name = "DependencyPass" as const;

  override get priority(): number {
    return PASS_PRIORITY.DependencyPass;
  }

  override supports(): boolean {
    return true;
  }

  override run(_ctx: CompilationContext, draft: IRDraft): void {
    const edges = draft.getEdges();

    for (const edge of edges) {
      if (edge.kind === "IMPORTS") {
        const fromNode = draft.getNode(edge.from);
        const toNode = draft.getNode(edge.to);

        if (fromNode?.kind === "MODULE" && toNode?.kind === "MODULE") {
          const dependsOnEdge: EdgeIR = {
            id: makeId("edge", "dependsOn", edge.from, edge.to),
            kind: "DEPENDS_ON",
            from: edge.from,
            to: edge.to,
            evidence: [
              {
                source: "AST",
                locator: "dependency",
                confidence: 1,
              },
            ],
          };
          draft.addEdge(dependsOnEdge);
        }
      }
    }
  }
}
