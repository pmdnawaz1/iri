/**
 * Generate ready-to-paste implementer prompts, one file per READY work order.
 *
 * Reads eos/state/project.index.json (produced by compile.ts), selects every
 * implementer TSPEC whose work order is WRITTEN, and emits prompts/prompt<N>.txt —
 * each a fully standalone prompt (rules + workflow + the full work order inlined).
 * Re-run after `pnpm eos:compile` whenever new work orders are authored.
 *
 * Run: pnpm eos:prompts   (tsx eos/compiler/make-prompts.ts)
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const INDEX = resolve(ROOT, "eos", "state", "project.index.json");
const OUT = resolve(ROOT, "prompts");

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

const TEMPLATE = `You are ROLE_IMPLEMENTER for the RIR repository. You implement exactly one TSPEC.

Hard rules (from decision1.md):
- Implement ONLY what the work order specifies. Make NO architectural decisions.
- Do NOT change the Repository IR, Requirement IR, ontology, the compiler pipeline,
  builder order, or any item in the work order's "Forbidden changes".
- No TODOs, no placeholder code, no dead code. Deterministic output only.
- Write REAL multi-line, formatted source. NEVER minify or strip newlines. CI runs
  \`prettier --check\` and rejects single-line / unformatted files.
- ADDITIVE ONLY: create only the new files the work order lists. Do NOT edit shared
  files (barrels/registries/package.json) unless told to; import directly from file paths.
- If anything is ambiguous or the work order seems wrong, STOP and report — do not guess.

Workflow:
1. Create the branch named in the header below (from \`main\`).
2. Implement the deliverables in the listed files only.
3. Write the tests from section 7 (acceptance criteria) and make them pass.
4. Run: pnpm install && pnpm format && pnpm build && pnpm typecheck && pnpm test  — all must be green.
5. Open a PR using .github/pull_request_template.md with commit message
   \`<type>(<tspec-id>): <summary>\` (e.g. feat(tspec-i002): ir serializer and validator).

Definition of done: build + typecheck + lint + the section-7 tests + coverage >= 95%.
`;

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

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const indexLines: string[] = [
  "RIR — READY-TO-PASTE IMPLEMENTER PROMPTS",
  "=========================================",
  "",
  "Each promptN.txt is fully self-contained. Open a FRESH session with your",
  "implementer model and paste the ENTIRE file. One file = one TSPEC = one PR.",
  "These are independent; you can run them in parallel.",
  "",
];

ready.forEach((t, i) => {
  const n = i + 1;
  const spec = readFileSync(resolve(ROOT, t.spec_path), "utf8");
  const deps = t.depends_on.length ? t.depends_on.join(", ") : "(none)";
  const file = [
    "================================================================================",
    `RIR IMPLEMENTER PROMPT ${n} — ${t.id}: ${t.title}`,
    `Branch: ${t.branch}`,
    `Depends on: ${deps} (already satisfied by the scaffold)`,
    "Paste this ENTIRE file into a fresh session with your implementer model.",
    "================================================================================",
    "",
    TEMPLATE,
    "----- WORK ORDER -----------------------------------------------------------------",
    "",
    spec.trimEnd(),
    "",
    "----------------------------------------------------------------------------------",
    "",
  ].join("\n");
  writeFileSync(resolve(OUT, `prompt${n}.txt`), file, "utf8");
  indexLines.push(`prompt${n}.txt  ->  ${t.id}  ${t.title}  [branch ${t.branch}]`);
});

indexLines.push("");
writeFileSync(resolve(OUT, "README.txt"), indexLines.join("\n"), "utf8");

process.stdout.write(
  `Wrote ${ready.length} prompt file(s) to prompts/ (prompt1..prompt${ready.length}.txt) + README.txt\n`,
);
