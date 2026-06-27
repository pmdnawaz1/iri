/**
 * Generate a single MEGA-BRANCH prompt (prompts2/mega-batch.txt).
 *
 * Unlike make-prompts.ts (one prompt per TSPEC, one branch each), this emits ONE prompt
 * that instructs the implementer to do EVERY ready work order on a single branch
 * (feature/mega-batch) and open ONE PR. Each work order is inlined in dependency order.
 *
 * Run: pnpm eos:mega   (tsx eos/compiler/make-mega-prompt.ts)
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const INDEX = resolve(ROOT, "eos", "state", "project.index.json");
const OUT = resolve(ROOT, "prompts2");

interface IndexedTspec {
  id: string;
  title: string;
  owner: string;
  state: string;
  branch: string;
  spec_path: string;
  spec_required: boolean;
  spec_status: string;
  wave: number;
  depends_on: string[];
}

const index = JSON.parse(readFileSync(INDEX, "utf8")) as { tspecs: IndexedTspec[] };
const ready = index.tspecs
  .filter(
    (t) =>
      t.owner === "ROLE_IMPLEMENTER" &&
      t.spec_required &&
      t.spec_status === "WRITTEN" &&
      t.state !== "COMPLETE",
  )
  .sort((a, b) => a.wave - b.wave || a.id.localeCompare(b.id));

const header = `================================================================================
RIR — MEGA-BRANCH IMPLEMENTER PROMPT
================================================================================
You are ROLE_IMPLEMENTER for the RIR repository. Implement ALL ${ready.length} work orders
below on ONE branch and open ONE pull request.

Hard rules (from decision1.md):
- Implement ONLY what each work order specifies. Make NO architectural decisions.
- Do NOT change the Repository IR, Requirement IR, ontology, the compiler pipeline,
  builder order, or any item in a work order's "Forbidden changes".
- Write REAL multi-line, formatted source. NEVER minify or strip newlines (CI runs
  prettier --check). No TODOs, no placeholder code, no dead code.
- ADDITIVE: create the new files each work order lists. Only edit a shared file when a
  work order explicitly says to. Import from package names / file paths as the work order shows.
- If a work order is ambiguous or seems wrong, STOP and report it — do not guess.

Workflow:
1. git checkout main && git pull, then: git checkout -b feature/mega-batch
2. Implement the work orders BELOW IN ORDER (they are sorted by dependency wave).
   Commit after each with: <type>(<tspec-id>): <summary>  (e.g. feat(tspec-p05): sql pass)
3. After ALL of them: pnpm install && pnpm format && pnpm build && pnpm typecheck && pnpm test
   — everything must be green.
4. Open ONE PR titled "feat: mega-batch (P04-P06, P15, APPs, CI, CE04-07, FX08)".

Order of work orders:
${ready.map((t, i) => `  ${i + 1}. ${t.id}  ${t.title}`).join("\n")}

The architect reviews the single PR, wires any new passes into the pipeline, and deploys.
================================================================================

`;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const sections = ready.map((t, i) => {
  const spec = readFileSync(resolve(ROOT, t.spec_path), "utf8").trimEnd();
  return [
    "################################################################################",
    `# WORK ORDER ${i + 1} / ${ready.length} — ${t.id}: ${t.title}`,
    `# Branch: feature/mega-batch (shared)   Depends on: ${t.depends_on.join(", ") || "(none)"}`,
    "################################################################################",
    "",
    spec,
    "",
  ].join("\n");
});

writeFileSync(resolve(OUT, "mega-batch.txt"), header + sections.join("\n"), "utf8");
writeFileSync(
  resolve(OUT, "README.txt"),
  `prompts2/mega-batch.txt — ONE prompt, ONE branch (feature/mega-batch), ONE PR.\n` +
    `Contains ${ready.length} work orders:\n` +
    ready.map((t) => `  ${t.id}  ${t.title}`).join("\n") +
    "\n",
  "utf8",
);

process.stdout.write(`Wrote prompts2/mega-batch.txt with ${ready.length} work orders.\n`);
