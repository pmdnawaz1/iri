import { AbstractPass } from "./base.js";
import type { CompilationContext, IRDraft } from "@rir/core";
import { makeId } from "@rir/common";

export class ComponentPass extends AbstractPass {
  readonly name = "ComponentPass";

  async run(ctx: CompilationContext, draft: IRDraft): Promise<void> {
    for (const pr of ctx.parseResults ?? []) {
      if (!pr.artifact.path.endsWith(".tsx") && !pr.artifact.path.endsWith(".jsx")) {
        continue;
      }

      for (const sym of pr.symbols) {
        if ((sym.kind === "function" || sym.kind === "class") && sym.name) {
          const firstChar = sym.name.charAt(0);
          if (firstChar === firstChar.toUpperCase() && firstChar.match(/[A-Z]/)) {
            const id = makeId("component", sym.name);
            draft.addNode({
              id,
              kind: "COMPONENT",
              name: sym.name,
              language: pr.artifact.language,
              artifactId: pr.artifact.id,
              span: sym.span,
              hash: "0",
              execution: { reachable: false, entryDistance: null, runtimeObserved: false, tested: false },
              evidence: [{ source: "AST", locator: pr.artifact.path, confidence: 1 }],
            });
          }
        }
      }
    }
  }
}
