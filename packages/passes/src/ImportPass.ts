/**
 * ImportPass — TSPEC-P01
 *
 * Lifts each artifact into a MODULE node and each ImportFact into an IMPORTS edge.
 * Additive only: creates new nodes/edges in the IRDraft; never mutates shared files.
 */

import type { CompilationContext, IRDraft } from "@rir/core";
import { makeId } from "@rir/common";
import { AbstractPass, PASS_PRIORITY } from "@rir/passes";

export class ImportPass extends AbstractPass {
  readonly name = "ImportPass" as const;

  override get priority(): number {
    return PASS_PRIORITY.ImportPass;
  }

  override supports(): boolean {
    return true;
  }

  override run(ctx: CompilationContext, draft: IRDraft): void {
    for (const pr of ctx.parseResults ?? []) {
      draft.addArtifact(pr.artifact);

      const fileModuleId = makeId("module", pr.artifact.path);

      draft.addNode({
        id: fileModuleId,
        kind: "MODULE",
        name: pr.artifact.path,
        artifactId: pr.artifact.id,
        span: null,
        hash: "0",
        language: pr.artifact.language,
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

      for (const imp of pr.imports) {
        const specModuleId = makeId("module", imp.specifier);

        draft.addNode({
          id: specModuleId,
          kind: "MODULE",
          name: imp.specifier,
          artifactId: pr.artifact.id,
          span: null,
          hash: "0",
          language: pr.artifact.language,
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

        draft.addEdge({
          id: makeId("edge", "imports", fileModuleId, specModuleId),
          kind: "IMPORTS",
          from: fileModuleId,
          to: specModuleId,
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
