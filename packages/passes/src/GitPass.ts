import { AbstractPass } from "./base.js";
import type { CompilationContext, IRDraft } from "@rir/core";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

export class GitPass extends AbstractPass {
  readonly name = "GitPass";

  async run(ctx: CompilationContext, draft: IRDraft): Promise<void> {
    const gitDir = path.join(ctx.repositoryRoot, ".git");
    if (!fs.existsSync(gitDir)) {
      ctx.logger.debug("no .git directory found, skipping GitPass");
      return;
    }

    let output: string;
    try {
      output = execSync("git log -n 50 --name-only --oneline", {
        cwd: ctx.repositoryRoot,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      });
    } catch (e) {
      ctx.logger.debug("git log failed, skipping GitPass");
      return;
    }

    const changedFiles = new Set<string>();
    for (const line of output.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      changedFiles.add(trimmed);
    }

    // Now find all nodes in the draft whose artifactId matches one of the changed files.
    for (const node of draft.getNodes()) {
      if (!node.artifactId) continue;

      // artifactId format is typically "artifact|<path>" or similar.
      // We can check if any changed file matches the locator or artifact path.
      // Let's extract the path from the artifactId.
      const prefix = "artifact|";
      if (node.artifactId.startsWith(prefix)) {
        const filePath = node.artifactId.slice(prefix.length);
        // git log uses forward slashes.
        const normalizedPath = filePath.replace(/\\/g, "/");
        if (changedFiles.has(normalizedPath)) {
          // Reassign evidence to bypass readonly constraints
          draft.addNode({
            ...node,
            evidence: [
              ...node.evidence,
              {
                source: "GIT_HISTORY",
                locator: normalizedPath,
                confidence: 0.8,
              } as any,
            ],
          });
        }
      }
    }
  }
}
