/**
 * One-shot generator for the IR-fidelity work orders (ADR-0025, TSPEC F01–F29).
 * Emits eos/specs/TSPEC-F<NN>.spec.md from the compact table below, so the Project
 * Compiler marks them WRITTEN and `pnpm eos:prompts` produces a paste-ready prompt
 * per task. Re-run: tsx eos/compiler/make-fidelity-specs.ts
 *
 * Every "copy" line is a direct steal from inspirations/codegraph/src/<path> to be
 * ADAPTED to the RIR IR — never reimplemented from scratch, never adopt their SQLite.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = resolve(ROOT, "eos", "specs");
mkdirSync(OUT, { recursive: true });

interface Spec {
  id: string;
  title: string;
  deps: string;
  objective: string;
  copy: string[]; // CodeGraph source files to steal+adapt
  files: string[]; // RIR files to create/modify
  steps: string[];
  accept: string[];
  forbid?: string[];
}

const cg = (p: string) => `inspirations/codegraph/src/${p}`;
const KEEP =
  "Keep RIR's IR as a single portable JSON (do NOT adopt CodeGraph's SQLite). Steal the logic, map the output to NodeIR/EdgeIR. Additive only — bump RIR_VERSION, never break existing fields.";

const SPECS: Spec[] = [
  {
    id: "F01",
    title: "NodeIR rich fields: signature / returnType / typeParameters / visibility / modifiers",
    deps: "TSPEC-P01",
    objective:
      "Add type-aware metadata to every METHOD/FUNCTION/CLASS node so RIR can answer 'what does this accept/return?' and reason about access/async. Today NodeIR has none of it.",
    copy: [cg("extraction/index.ts"), cg("extraction/languages/typescript.ts"), cg("types.ts")],
    files: [
      "modify packages/ir/src/index.ts (NodeIR += optional signature, returnType, typeParameters, visibility, isExported, isAsync, isStatic, isAbstract; bump RIR_VERSION)",
      "modify packages/code-compiler/src/language/typescript.ts (populate them from the AST)",
      "modify tests/e2e or tests/compiler with assertions",
    ],
    steps: [
      "Port CodeGraph's signature builder (extraction/languages/typescript.ts `returnField`/signature) and modifier readers (isAsync etc.) — adapt to emit onto NodeIR fields, not SQLite columns.",
      "visibility = public|private|protected|internal from TS modifiers; isExported from export modifier; isStatic/isAbstract/isAsync from modifiers.",
      "Leave nodes without a signature (e.g. ROUTE) unset; fields are optional.",
    ],
    accept: [
      "a method `login(email: string): Promise<Token>` yields signature with params+return, isAsync=true, visibility set",
      "an exported class has isExported=true",
      "existing IR tests still pass; RIR_VERSION bumped",
    ],
  },
  {
    id: "F02",
    title: "NodeIR qualifiedName + promoted filePath + node-level line/col span",
    deps: "TSPEC-F01",
    objective:
      "Disambiguate same-name symbols across classes/files (Class::method) and give every node precise location, not just file-level evidence.",
    copy: [cg("types.ts"), cg("extraction/index.ts")],
    files: [
      "modify packages/ir/src/index.ts (NodeIR += qualifiedName, filePath; ensure span carries startLine/endLine/startColumn/endColumn)",
      "modify the adapters to populate qualifiedName + filePath",
    ],
    steps: [
      "qualifiedName = enclosing-chain joined `Class::method` (CodeGraph types.ts qualifiedName).",
      "Promote filePath onto the node (today only in evidence.locator).",
      "Populate span with real start/end line+col from the AST node.",
    ],
    accept: [
      "two classes each with `create()` produce distinct qualifiedName values",
      "every node has filePath and a line/col span",
    ],
  },
  {
    id: "F03",
    title: "NodeIR decorators[] as data (critical for NestJS)",
    deps: "TSPEC-F01",
    objective:
      "Capture decorators as structured data so route/DI/guard discovery can read @Controller/@Get/@Injectable/@Module/@UseGuards instead of guessing.",
    copy: [cg("extraction/languages/typescript.ts"), cg("extraction/index.ts")],
    files: [
      "modify packages/ir/src/index.ts (NodeIR.decorators?: { name: string; args: string[] }[])",
      "modify packages/code-compiler/src/language/typescript.ts (extract decorators on classes/methods/params)",
    ],
    steps: [
      "Reuse the A021 decorator walker; instead of only producing routes, attach the full decorator list to the owning node.",
      "Record name + string-literal args (path, token).",
    ],
    accept: [
      "a @Controller('auth') class node has decorators including {name:'Controller',args:['auth']}",
      "a @Post('login') method node carries that decorator",
    ],
  },
  {
    id: "F04",
    title: "NodeIR docstring (JSDoc/TSDoc) extraction",
    deps: "TSPEC-F01",
    objective: "Extract leading JSDoc/TSDoc into node.docstring for doc-coverage and search.",
    copy: [cg("extraction/index.ts")],
    files: [
      "modify packages/ir/src/index.ts (NodeIR.docstring?: string)",
      "modify packages/code-compiler/src/language/typescript.ts",
    ],
    steps: ["Read the leading comment block above a declaration; strip `/**` markers; store trimmed text."],
    accept: ["a documented function carries its docstring text", "undocumented nodes leave it unset"],
  },
  {
    id: "F05",
    title: "PROPERTY / FIELD nodes (class fields, DI tokens)",
    deps: "TSPEC-F01",
    objective:
      "Make class fields and constructor-injected params first-class nodes — the injection points NestJS DI needs (F15).",
    copy: [cg("types.ts"), cg("extraction/index.ts")],
    files: [
      "modify packages/ir/src/index.ts (NodeKind += PROPERTY, FIELD)",
      "modify packages/code-compiler/src/language/typescript.ts (emit fields + ctor params)",
    ],
    steps: [
      "Emit a PROPERTY/FIELD node per class field and per constructor parameter (the DI token = its type).",
      "Carry the declared type so F15 can resolve provider→consumer.",
    ],
    accept: ["a `constructor(private svc: AuthService)` yields a FIELD node typed AuthService"],
  },
  {
    id: "F06",
    title: "CONSTANT / ENUM / ENUM_MEMBER nodes",
    deps: "TSPEC-F01",
    objective:
      "Surface config values and type constants so code-side constraint extraction (P10) can read enum values instead of scanning raw text.",
    copy: [cg("types.ts"), cg("extraction/index.ts")],
    files: [
      "modify packages/ir/src/index.ts (NodeKind += CONSTANT, ENUM, ENUM_MEMBER)",
      "modify packages/code-compiler/src/language/typescript.ts",
    ],
    steps: ["Emit ENUM + ENUM_MEMBER nodes for enums; CONSTANT for top-level const literals."],
    accept: ["a TS enum yields one ENUM + N ENUM_MEMBER nodes"],
  },
  {
    id: "F07",
    title: "TYPE_ALIAS nodes + granular IMPORT nodes",
    deps: "TSPEC-F01",
    objective:
      "Track custom types and which specific symbols are imported (today all imports collapse into DEPENDS_ON, losing the symbol).",
    copy: [cg("extraction/index.ts")],
    files: [
      "modify packages/ir/src/index.ts (NodeKind += TYPE_ALIAS, IMPORT)",
      "modify packages/code-compiler/src/language/typescript.ts",
    ],
    steps: [
      "Emit a TYPE_ALIAS node per `type X = ...`; one IMPORT node per imported symbol (keep the existing DEPENDS_ON edge).",
    ],
    accept: ["`import { A, B } from 'x'` yields 2 IMPORT nodes"],
  },
  {
    id: "F08",
    title: "CONTAINS edges (file -> class -> method symbol tree)",
    deps: "TSPEC-F01",
    objective: "Add the containment tree so 'what's in this file/class?' needs no scan; F13/F17 traverse it.",
    copy: [cg("extraction/index.ts"), cg("types.ts")],
    files: [
      "modify packages/ir/src/index.ts (EdgeKind += CONTAINS)",
      "modify the adapters / a pass to emit file->symbol and class->member CONTAINS edges",
    ],
    steps: ["For each declaration, emit CONTAINS from its artifact/file node (or enclosing class) to it."],
    accept: ["a file with one class+method yields file->class and class->method CONTAINS edges"],
  },
  {
    id: "F09",
    title: "EXTENDS + IMPLEMENTS edges (class hierarchy)",
    deps: "TSPEC-F01",
    objective: "Build the inheritance graph so 'what implements this interface?' is answerable.",
    copy: [cg("extraction/index.ts")],
    files: [
      "modify packages/ir/src/index.ts (EdgeKind += EXTENDS, IMPLEMENTS)",
      "modify packages/code-compiler/src/language/typescript.ts",
    ],
    steps: [
      "From `class X extends Y implements Z` emit EXTENDS X->Y and IMPLEMENTS X->Z (resolve names in F13).",
    ],
    accept: ["a class extending a base + implementing an interface yields both edges"],
  },
  {
    id: "F10",
    title: "INSTANTIATES edges (new X())",
    deps: "TSPEC-F01",
    objective: "Trace who constructs what — needed for DI/factory analysis (F15).",
    copy: [cg("extraction/index.ts")],
    files: [
      "modify packages/ir/src/index.ts (EdgeKind += INSTANTIATES)",
      "modify packages/code-compiler/src/language/typescript.ts",
    ],
    steps: ["For each `new X(...)` emit INSTANTIATES from the enclosing symbol to X."],
    accept: ["a method doing `new AuthService()` yields an INSTANTIATES edge"],
  },
  {
    id: "F11",
    title: "REFERENCES edges (value / constant / config usage)",
    deps: "TSPEC-F06",
    objective: "Trace constant/config usage through code (CodeGraph: 18k references edges; RIR: 0).",
    copy: [cg("extraction/index.ts")],
    files: [
      "modify packages/ir/src/index.ts (EdgeKind += REFERENCES, edge metadata.valueRef)",
      "modify the adapters",
    ],
    steps: ["Emit REFERENCES from a symbol to a CONSTANT/ENUM_MEMBER it reads, metadata.valueRef=true."],
    accept: ["a function reading an enum member yields a REFERENCES edge"],
  },
  {
    id: "F12",
    title: "DECORATES edges (which decorator applied where)",
    deps: "TSPEC-F03",
    objective: "Make the decorator→target relationship a graph edge.",
    copy: [cg("extraction/index.ts")],
    files: [
      "modify packages/ir/src/index.ts (EdgeKind += DECORATES)",
      "modify packages/code-compiler/src/language/typescript.ts",
    ],
    steps: ["For each decorator on a node, emit DECORATES from a decorator node to the decorated node."],
    accept: ["@Injectable on a class yields a DECORATES edge"],
  },
  {
    id: "F13",
    title: "ReferenceResolver: import resolution + name matching (deep call graph)",
    deps: "TSPEC-F02, TSPEC-F08",
    objective:
      "THE missing layer. Resolve callee names to their definitions across files so CALLS edges actually connect (288 -> ~46k on cal.com). Without this, closure can never traverse route->service.",
    copy: [
      cg("resolution/import-resolver.ts"),
      cg("resolution/name-matcher.ts"),
      cg("resolution/path-aliases.ts"),
      cg("resolution/index.ts"),
    ],
    files: [
      "create packages/resolution/ (new workspace package): a post-pass that runs after extraction",
      "wire it into the compiler pipeline AFTER CallPass, BEFORE CapabilityPass (architect will confirm order)",
    ],
    steps: [
      "Port import-resolver (incl. tsconfig path aliases) + name-matcher: for each unresolved call, find the imported/defined symbol it targets and add a precise CALLS edge to that node.",
      "Adapt CodeGraph's SQLite lookups to operate over the in-memory IR node set.",
    ],
    accept: [
      "on fixtures/express-auth the controller->service->repository CALLS chain is fully connected",
      "on cal.com the CALLS edge count rises into the tens of thousands (was 288)",
    ],
    forbid: ["Do NOT change the closure/ontology rules — only add edges."],
  },
  {
    id: "F14",
    title: "Framework route + DI resolution (NestJS / Express / Spring / FastAPI / Gin)",
    deps: "TSPEC-F03, TSPEC-F13",
    objective:
      "Emit ROUTE nodes from framework conventions so cal.com yields ~314 routes with ZERO false positives (today: 132 incl. `GET api.port` from configService.get).",
    copy: [
      cg("resolution/frameworks/nestjs.ts"),
      cg("resolution/frameworks/express.ts"),
      cg("resolution/frameworks/java.ts"),
      cg("resolution/frameworks/python.ts"),
      cg("resolution/frameworks/go.ts"),
      cg("resolution/frameworks/index.ts"),
    ],
    files: [
      "add framework resolvers under packages/resolution/frameworks/",
      "they consume decorators (F03) + the resolved graph (F13)",
    ],
    steps: [
      "Port the NestJS resolver: @Controller base + method HTTP decorators => ROUTE nodes wired to the handler method node.",
      "Port Express/Spring/FastAPI/Gin resolvers similarly.",
      "Route extraction comes from frameworks now — REMOVE the naive imperative `.get/.post` route guessing that produces config-call false positives (coordinate with F20).",
    ],
    accept: [
      "cal.com (apps/api/v2/src) yields >=300 ROUTE nodes",
      "no ROUTE named like `GET api.port` / `GET env.type`",
    ],
  },
  {
    id: "F15",
    title: "DI / provider mapping: PROVIDES edges (NestJS @Module + constructor injection)",
    deps: "TSPEC-F05, TSPEC-F10, TSPEC-F14",
    objective:
      "Connect controller -> injected service -> repository through DI so the closure chain physically exists in the graph.",
    copy: [cg("resolution/frameworks/nestjs.ts")],
    files: ["extend packages/resolution/frameworks/nestjs.ts adaptation"],
    steps: [
      "Read @Module providers/controllers; for each controller's constructor FIELD (F05) typed as a provider, add an edge controller->service (CALLS or a new USES).",
      "Add PROVIDES edges MODULE->SERVICE/REPOSITORY.",
    ],
    accept: [
      "a NestJS controller injecting a service that injects a repository forms a connected path in the IR",
    ],
  },
  {
    id: "F16",
    title: "Dynamic-dispatch synthesizers (callback / observer / event edges)",
    deps: "TSPEC-F13",
    objective: "Bridge dynamic edges (callbacks, EventEmitter) so flows don't break at indirection.",
    copy: [cg("resolution/callback-synthesizer.ts")],
    files: ["add packages/resolution/synthesizers/"],
    steps: [
      "Port the callback synthesizer; mark synthesized edges with evidence confidence < 1 (provenance heuristic).",
    ],
    accept: ["a callback registered then invoked is connected by a synthesized edge with confidence < 1"],
  },
  {
    id: "F17",
    title: "Entry-point reachability tracing (bootstrap/main -> call graph)",
    deps: "TSPEC-F13",
    objective:
      "Fix reachable:false on 99% of nodes. Trace reachability from real entrypoints over the RESOLVED graph (F13).",
    copy: [],
    files: [
      "modify packages/passes/src/ReachabilityPass.ts to traverse the resolved CALLS/CONTAINS graph from entrypoints",
    ],
    steps: [
      "Entrypoints = ROUTE/FRONTEND_ROUTE handlers + bootstrap()/main(). BFS over resolved edges; set execution.reachable + entryDistance.",
      "Must run AFTER F13/F14 so the edges exist.",
    ],
    accept: [
      "on cal.com the reachable-node count is a large fraction of nodes (was 13/3369)",
      "a route's whole handler chain is reachable",
    ],
  },
  {
    id: "F18",
    title: "Closure populates on the resolved DI graph (the headline fix)",
    deps: "TSPEC-F14, TSPEC-F15, TSPEC-F17",
    objective:
      "Make CLOSED true on a real repo. With routes (F14), DI edges (F15), and reachability (F17) in place, the closure chain route->controller->service->repository->db->response exists for real handlers.",
    copy: [],
    files: [
      "add a golden regression test compiling D:/rir-targets/cal.com/apps/api/v2/src (or a vendored slice) asserting closure leaves all-ORPHAN",
    ],
    steps: [
      "Verify STAGE_OF_NODE_KIND + tier rules map the resolved nodes correctly; fix gaps where a resolved chain still reads PARTIAL.",
      "Confirm >=1 capability reaches CLOSED on cal.com.",
    ],
    accept: [
      ">=1 cal.com capability is CLOSED",
      "closure state distribution is no longer 100% ORPHAN/PARTIAL",
    ],
    forbid: ["Do NOT weaken the closure rules to force CLOSED — fix the graph, not the gate."],
  },
  {
    id: "F19",
    title: "Control-flow edges (CATCHES / THROWS) + MIDDLEWARE node + WRAPS edges",
    deps: "TSPEC-F08",
    objective: "Make error propagation and the NestJS middleware/guard pipeline visible.",
    copy: [cg("extraction/index.ts")],
    files: [
      "modify packages/ir/src/index.ts (EdgeKind += CATCHES, THROWS, WRAPS; NodeKind += MIDDLEWARE)",
      "emit from adapters/resolvers",
    ],
    steps: [
      "try/catch => CATCHES; throw => THROWS; middleware/guard wrapping a route => MIDDLEWARE node + WRAPS edge.",
    ],
    accept: ["a guarded route has a MIDDLEWARE node and a WRAPS edge"],
  },
  {
    id: "F20",
    title: "Route extraction correctness: kill config-call false positives",
    deps: "TSPEC-A021",
    objective:
      "Stop misclassifying `configService.get('api.port')` as `GET api.port`. Routes should come from framework resolvers (F14) or known router receivers only.",
    copy: [],
    files: ["modify packages/code-compiler/src/language/{typescript,go}.ts route extraction"],
    steps: [
      "Restrict imperative `.get/.post(...)` route detection to receivers that are known routers (app/router/r/e/fastify) — never arbitrary objects.",
      "Prefer the F14 framework resolvers; the imperative path is the fallback.",
    ],
    accept: [
      "compiling cal.com yields no ROUTE whose path looks like a config key",
      "express fixtures still produce their routes",
    ],
  },
  {
    id: "F21",
    title: "IR files[] metadata (language / size / hash / nodeCount)",
    deps: "TSPEC-P01",
    objective: "Add a files[] section for file-level impact analysis.",
    copy: [cg("db/schema.sql")],
    files: ["modify packages/ir/src/index.ts (RepositoryIR.files[])", "populate in @rir/compiler"],
    steps: ["Per compiled file emit { path, language, size, contentHash, nodeCount }."],
    accept: ["the IR has one files[] entry per source file with a content hash"],
  },
  {
    id: "F22",
    title: "IR schemaVersion header + migration discipline",
    deps: "TSPEC-P01",
    objective: "Stamp a schemaVersion on the IR and document the additive-only migration rule.",
    copy: [cg("db/migrations.ts")],
    files: [
      "modify packages/ir/src/index.ts (schemaVersion on RepositoryIR header)",
      "docs note on additive migrations",
    ],
    steps: ["Add schemaVersion constant; document that new fields/kinds are additive and bump it."],
    accept: ["serialized IR carries schemaVersion"],
  },
  {
    id: "F23",
    title: "rir search <query> — full-text over name / qualifiedName / docstring",
    deps: "TSPEC-F02, TSPEC-F04",
    objective: "A search CLI so humans/agents find nodes by name or docstring without grep.",
    copy: [cg("search/query-parser.ts"), cg("search/query-utils.ts")],
    files: ["add `rir search` to apps/cli/src/index.ts operating over an ir.json"],
    steps: ["Port the query parser; match against node name/qualifiedName/docstring; print ranked hits."],
    accept: ["`rir search login ir.json` returns the login-related nodes"],
  },
  {
    id: "F24",
    title: "Test-coverage mapping (lcov -> node.execution.tested)",
    deps: "TSPEC-F02",
    objective: "Populate execution.tested from real coverage data (today always false).",
    copy: [],
    files: [
      "add a pass that ingests lcov / coverage-final.json and sets execution.tested + TESTS evidence per node by file+line",
    ],
    steps: [
      "Parse lcov; map covered lines to nodes via filePath+span; set tested=true + add TESTS evidence.",
    ],
    accept: ["nodes whose lines are covered have execution.tested=true and a TESTS evidence entry"],
  },
  {
    id: "F25",
    title: "Git churn / change-frequency per node",
    deps: "TSPEC-F02",
    objective: "Attach commit-count / last-modified per node (risk signal).",
    copy: [],
    files: ["extend packages/passes/src/GitPass.ts to attribute churn to nodes by file+line"],
    steps: ["Run git log per file; map line ranges to nodes; store commitCount + lastModified."],
    accept: ["a frequently-changed symbol has a higher commitCount than a stable one"],
  },
  {
    id: "F26",
    title: "Dead-code detection (reachability + graph)",
    deps: "TSPEC-F17",
    objective: "Report exported-but-unreachable and never-referenced symbols.",
    copy: [],
    files: ["add a consistency check emitting a DEAD_CODE finding"],
    steps: [
      "After F17, a symbol that is not reachable AND has no inbound CALLS/REFERENCES edge is dead; report it.",
    ],
    accept: ["an unused exported function is reported; a used one is not"],
  },
  {
    id: "F27",
    title: "Runtime-trace ingestion (execution.runtimeObserved via OTel)",
    deps: "TSPEC-F17",
    objective:
      "Fuse production traces so runtimeObserved becomes real; reconcile static vs runtime edges (GAPS-v2 V4).",
    copy: [],
    files: ["add a pass ingesting OTel spans -> RUNTIME evidence on matching nodes/edges"],
    steps: [
      "Map span operation names to routes/handlers; set runtimeObserved + add RUNTIME evidence; flag runtime edges missing statically.",
    ],
    accept: ["a node hit by an ingested trace has runtimeObserved=true with RUNTIME evidence"],
  },
  {
    id: "F28",
    title: "Dependency version tracking (package.json / lockfile -> DEPENDS_ON metadata)",
    deps: "TSPEC-P01",
    objective: "Attach resolved external dependency versions to DEPENDS_ON edges.",
    copy: [],
    files: [
      "extend DependencyPass to read package.json/lockfile (and pip/go) and tag external DEPENDS_ON edges with the resolved version",
    ],
    steps: ["Resolve each external import to its declared+locked version; store on the edge metadata."],
    accept: ["an external dependency edge carries its resolved version"],
  },
  {
    id: "F29",
    title: "Performance annotations: N+1 query + hot-path / slow-operation detection",
    deps: "TSPEC-F13",
    objective: "Flag N+1 queries and hot paths over the resolved call graph.",
    copy: [],
    files: ["add a consistency check using the resolved CALLS graph + SQL_QUERY nodes"],
    steps: [
      "N+1 = a SQL_QUERY reachable from inside a loop/iteration in a handler path => finding.",
      "Hot path = high fan-in node on the call graph; slow-op = sync IO in a request path => node annotations.",
    ],
    accept: ["a query executed inside a loop is reported as a potential N+1"],
  },
];

const render = (s: Spec): string => {
  const dash = (xs: string[]) => xs.map((x) => `- ${x}`).join("\n");
  return `# TSPEC-${s.id} — ${s.title} (Work Order)

> Authored by ROLE_ARCHITECT for the IR-fidelity program (ADR-0025). STEAL-AND-ADAPT from
> CodeGraph (\`inspirations/codegraph\`), then map the output onto RIR's IR. ${KEEP}

- **TSPEC:** TSPEC-${s.id} · **Owner:** ROLE_IMPLEMENTER · **Header:** \`eos/tspecs/TSPEC-${s.id}.yaml\`
- **Depends on:** ${s.deps || "(none)"} · **ADR:** docs/ADR-0025-ir-fidelity-steal-from-codegraph.md

## 1. Objective
${s.objective}

## 2. USE THE STEAL TRANSFORM (mapping + oracle — do not reimplement blind)
The CG->RIR field/edge-kind mapping is already implemented and PROVEN in
\`tools/steal/codegraph-to-rir.mjs\` (run on cal.com it yields 314 ROUTE, 46,659 CALLS,
51,475 CONTAINS, plus signature/qualifiedName/decorators on nodes). Use it TWO ways:
1. **MAPPING** — it defines the EXACT RIR field/kind names your extractor must emit (e.g.
   \`qualifiedName\`, \`signature\`, \`decorators\`, \`CONTAINS\`/\`EXTENDS\`/\`INSTANTIATES\`). Match them.
2. **ORACLE** — generate the reference IR:
   \`node --experimental-sqlite tools/steal/codegraph-to-rir.mjs <repo>/.codegraph/codegraph.db ref.json\`
   then assert YOUR native \`rir compile <repo>\` reproduces the same kind/field for the same
   construct (file+line) within tolerance. The transform is your golden target.
${s.copy.length ? "\nThen steal-and-adapt the extraction logic from CodeGraph source:\n" + dash(s.copy) : "\n(no direct file steal — RIR-native; the transform output is still your field/kind oracle)"}

## 3. Files
${dash(s.files)}

## 4. Algorithm / behavior
${dash(s.steps)}

## 5. Acceptance criteria
${dash(s.accept)}
- Builds, typechecks, lint clean, \`pnpm typecheck:tests\` green, coverage >= 95%.

## 6. Forbidden changes
${dash([
  "Do NOT adopt CodeGraph's SQLite/schema — RIR stays one portable JSON.",
  "Do NOT change closure/coverage/consistency/ontology RULES (architect-owned) unless this TSPEC says so.",
  "Additive only; bump RIR_VERSION when adding IR fields/kinds. No minify, no TODOs.",
  ...(s.forbid ?? []),
])}

## 7. References
- ADR-0025 (program + copy-from mapping + coverage matrix) · docs/codegraph-comparison-table.md
- CodeGraph architecture: \`inspirations/codegraph/CLAUDE.md\`
`;
};

let n = 0;
for (const s of SPECS) {
  writeFileSync(resolve(OUT, `TSPEC-${s.id}.spec.md`), render(s), "utf8");
  n++;
}
process.stdout.write(`Wrote ${n} fidelity work orders to eos/specs/TSPEC-F*.spec.md\n`);
