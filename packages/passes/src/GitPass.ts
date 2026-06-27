import { AbstractPass } from "./base.js";
import type { CompilationContext, IRDraft } from "@rir/core";
import { makeId } from "@rir/common";
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
      // Skip the commit header lines which look like: <hash> <message>
      // We know file paths generally won't contain spaces in this output format,
      // but to be safe, if a line has a space and looks like a commit header, skip.
      // However, --name-only prints the commit message then the file names.
      // A simple heuristic: if it's a file path that exists, or we just collect everything
      // and match against artifacts. Matching against artifact IDs is safest.
      changedFiles.add(trimmed);
    }

    // Now find all nodes in the draft whose artifactId matches one of the changed files.
    for (const node of draft.getNodes()) {
      if (!node.artifactId) continue;
      
      // artifactId format is typically "artifact|<path>" or similar.
      // We can check if any changed file matches the locator or artifact path.
      // Let's extract the path from the artifactId. Assuming makeId("artifact", path) -> "artifact|<path>"
      const prefix = "artifact|";
      if (node.artifactId.startsWith(prefix)) {
        const filePath = node.artifactId.slice(prefix.length);
        // git log uses forward slashes.
        const normalizedPath = filePath.replace(/\\/g, "/");
        if (changedFiles.has(normalizedPath)) {
          // Mutate the node to add evidence
          node.evidence.push({
            source: "GIT_HISTORY",
            locator: normalizedPath,
            confidence: 0.8,
          });
        }
      }
    }
  }
}
