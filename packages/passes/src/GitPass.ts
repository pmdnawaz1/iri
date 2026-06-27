import { AbstractPass } from "./base.js";
import type { CompilationContext, IRDraft } from "@rir/core";
import { execFileSync } from "node:child_process";
import { dirname } from "node:path";

/** Resolve the last-commit sha for a file, or null. Injectable for testing. */
export type GitRunner = (filePath: string) => string | null;

function defaultRunner(filePath: string): string | null {
  try {
    const sha = execFileSync("git", ["log", "-1", "--format=%H", "--", filePath], {
      cwd: dirname(filePath),
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return sha || null;
  } catch {
    return null;
  }
}

/**
 * GitPass — attaches GIT provenance evidence to nodes from the git history of their
 * source file. Deterministic given the injected runner; not in the default pipeline.
 * Per TSPEC-P15 / ADR-0016.
 */
export class GitPass extends AbstractPass {
  readonly name = "GitPass";

  constructor(private readonly runGit: GitRunner = defaultRunner) {
    super();
  }

  run(ctx: CompilationContext, draft: IRDraft): void {
    const pathByArtifact = new Map(ctx.artifacts.map((a) => [a.id, a.path]));
    for (const node of draft.getNodes()) {
      const filePath = pathByArtifact.get(node.artifactId);
      if (!filePath) continue;
      const sha = this.runGit(filePath);
      if (!sha) continue;
      if (node.evidence.some((e) => e.source === "GIT" && e.locator === sha)) continue;
      draft.addNode({
        ...node,
        evidence: [...node.evidence, { source: "GIT", locator: sha, confidence: 1 }],
      });
    }
  }
}
