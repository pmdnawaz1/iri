/**
 * Bundle the 29 IR-fidelity work orders (ADR-0025) into THREE sequential PR prompts.
 * Each prompt = one branch = one PR covering a dependency layer, with every member
 * work order inlined in order. Reads eos/specs/TSPEC-F*.spec.md.
 *
 * Run: tsx eos/compiler/make-fidelity-pr-prompts.ts  -> fidelity-prompts/PR{1,2,3}.txt
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SPECS = resolve(ROOT, "eos", "specs");
const OUT = resolve(ROOT, "fidelity-prompts");

interface Group {
  id: string;
  branch: string;
  title: string;
  summary: string;
  /** TSPEC ids in DEPENDENCY ORDER (implement top to bottom). */
  order: string[];
  dependsOnPr: string;
  extraAcceptance: string[];
}

const GROUPS: Group[] = [
  {
    id: "PR1",
    branch: "feat/ir-fidelity-1-depth",
    title: "IR depth — node fields, node/edge kinds, files[], schemaVersion",
    summary:
      "Enrich the IR to real-codebase fidelity: rich node fields (signature/qualifiedName/decorators/docstring/modifiers), new node kinds (property/field/constant/enum/type_alias/import), structural edges (contains/extends/implements/instantiates/references/decorates), control-flow edges, files[] metadata, schemaVersion. All additive to packages/ir + the TS adapter.",
    order: [
      "F01",
      "F02",
      "F03",
      "F04",
      "F05",
      "F06",
      "F07",
      "F08",
      "F09",
      "F10",
      "F11",
      "F12",
      "F19",
      "F21",
      "F22",
    ],
    dependsOnPr: "(none — start here)",
    extraAcceptance: [
      "RIR_VERSION bumped once; all new fields/kinds are optional/additive; existing tests stay green.",
      "Validate against the steal oracle: node fields you emit match tools/steal/codegraph-to-rir.mjs output for the same constructs.",
    ],
  },
  {
    id: "PR2",
    branch: "feat/ir-fidelity-2-resolution",
    title: "Resolution layer + closure on real code (the headline fix)",
    summary:
      "Add packages/resolution: import-resolution + name-matching for a deep call graph, framework route+DI resolvers (NestJS/Express/Spring/FastAPI/Gin), PROVIDES/DI edges, dynamic-dispatch synthesizers, entry-point reachability — then closure actually CLOSES on a real repo. Route precision kills config-call false positives.",
    order: ["F20", "F13", "F14", "F15", "F16", "F17", "F18"],
    dependsOnPr:
      "PR1 (needs qualifiedName/filePath F02, CONTAINS F08, decorators F03, property/field F05, instantiates F10)",
    extraAcceptance: [
      "GOLDEN: rir compile D:/rir-targets/cal.com/apps/api/v2/src yields >=300 routes, 0 config-call false positives, >=1 capability CLOSED, and CALLS/edge counts within ~2x of the steal transform output.",
      "closure state distribution is no longer 100% ORPHAN/PARTIAL.",
    ],
  },
  {
    id: "PR3",
    branch: "feat/ir-fidelity-3-analysis",
    title: "Correctness + opportunities — search, coverage, churn, dead-code, runtime, deps, perf",
    summary:
      "The analysis layer on top of the resolved graph: rir search, test-coverage mapping, git churn, dead-code detection, runtime-trace ingestion, dependency versions, performance (N+1) annotations.",
    order: ["F28", "F23", "F24", "F25", "F26", "F27", "F29"],
    dependsOnPr: "PR1 + PR2 (needs the resolved graph + reachability F17 and deep calls F13)",
    extraAcceptance: ["Each analysis output is deterministic and covered by a test on a fixture."],
  },
];

const RULES = `You are ROLE_IMPLEMENTER for the RIR repository. This is ONE PR that implements
MULTIPLE related TSPECs on ONE branch, in the order given.

Hard rules (decision1.md):
- Implement the work orders below IN ORDER. They build on each other.
- ADDITIVE to the IR: bump RIR_VERSION once for the whole PR; new fields/kinds are optional.
  Do NOT change closure/coverage/consistency/ontology RULES unless a work order says so.
- STEAL, do not reinvent: every work order's "USE THE STEAL TRANSFORM" section is mandatory.
  tools/steal/codegraph-to-rir.mjs is your field/kind mapping AND your validation oracle.
  Steal-and-adapt the cited inspirations/codegraph/src/* files; never adopt their SQLite.
- Real, formatted, multi-line source. No TODOs, no placeholders, no minify (CI runs prettier --check).
- If a work order is ambiguous or wrong, STOP and report — do not guess.

Workflow:
1. Create the branch named below from main.
2. Implement each work order in order; keep its tests passing before moving to the next.
3. Run: pnpm install && pnpm format && pnpm build && pnpm typecheck && pnpm typecheck:tests && pnpm test  — all green.
4. Open ONE PR for the whole branch (commit per work order is fine) using
   .github/pull_request_template.md.

Definition of done: build + typecheck (incl. tests) + lint + all the work orders' acceptance
criteria + this PR's extra acceptance, with coverage >= 95%.`;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const index: string[] = [
  "RIR IR-FIDELITY — THREE PR PROMPTS (ADR-0025)",
  "=".repeat(46),
  "",
  "Run sequentially: PR1 -> PR2 -> PR3 (later PRs depend on earlier).",
  "",
];

for (const g of GROUPS) {
  const orders = g.order
    .map((id) => {
      const md = readFileSync(resolve(SPECS, `TSPEC-${id}.spec.md`), "utf8").trimEnd();
      return `===== WORK ORDER ${id} ${"=".repeat(60)}\n\n${md}\n`;
    })
    .join("\n");
  const file = [
    "=".repeat(80),
    `RIR ${g.id} — ${g.title}`,
    `Branch: ${g.branch}`,
    `Depends on: ${g.dependsOnPr}`,
    `TSPECs (in order): ${g.order.join(" -> ")}`,
    "Paste this ENTIRE file into a fresh implementer session. It is ONE branch = ONE PR.",
    "=".repeat(80),
    "",
    `## This PR`,
    g.summary,
    "",
    RULES,
    "",
    `## Extra acceptance for ${g.id}`,
    ...g.extraAcceptance.map((a) => `- ${a}`),
    "",
    `## The ${g.order.length} work orders (implement in this order)`,
    "",
    orders,
  ].join("\n");
  writeFileSync(resolve(OUT, `${g.id}.txt`), file, "utf8");
  index.push(
    `${g.id}.txt  ->  ${g.title}  [branch ${g.branch}]  (${g.order.length} tasks: ${g.order.join(",")})`,
  );
}

writeFileSync(resolve(OUT, "README.txt"), index.join("\n") + "\n", "utf8");
process.stdout.write(`Wrote ${GROUPS.length} PR prompts to fidelity-prompts/ (PR1..PR3.txt + README.txt)\n`);
