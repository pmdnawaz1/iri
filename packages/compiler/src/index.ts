/**
 * @rir/compiler — the Repository Compiler (the real pipeline).
 *
 * Orchestrates the wired stages decided in ADR-0016:
 *   dir → language adapters → ParseResult[] → compiler passes → Repository IR → closure.
 *
 * This replaces the ad-hoc proving slice (`apps/cli/src/prove.ts`) with the real
 * frontend + pass pipeline. It owns no semantics — it only sequences the existing,
 * independently-tested adapters, passes, and the closure engine.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { ConsoleLogger } from "@rir/common";
import {
  AdapterRegistry,
  CSharpAdapter,
  GoAdapter,
  JavaAdapter,
  JavaScriptAdapter,
  PythonAdapter,
  RustAdapter,
  TypeScriptAdapter,
  type ParseResult,
} from "@rir/code-compiler";
import { BuilderEngine } from "@rir/builder-engine";
import {
  CallPass,
  CapabilityPass,
  ComponentPass,
  DependencyPass,
  EventPass,
  ImportPass,
  ReachabilityPass,
  RoutePass,
  SQLPass,
} from "@rir/passes";
import { DefaultClosureEngine, type ClosureResult } from "@rir/closure";
import {
  DefaultRequirementNormalizer,
  FrontendRegistry,
  MarkdownFrontend,
  OpenApiFrontend,
  suggestAliases,
  type AliasSuggestion,
  type DocumentStructure,
  type SuggestOptions,
} from "@rir/document-compiler";
import { CrossConsistencyEngine, type CrossFinding } from "@rir/consistency";
import type { Builder, CompilationContext, Pass } from "@rir/core";
import type { ClosureState, RepositoryIR, RequirementSet } from "@rir/ir";

const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".java",
  ".go",
  ".rs",
  ".cs",
]);

const DOC_EXTENSIONS = new Set([".md", ".markdown", ".yaml", ".yml", ".json"]);

/** A registry with every built document frontend. */
export function defaultDocumentFrontends(): FrontendRegistry {
  return new FrontendRegistry().register(new MarkdownFrontend()).register(new OpenApiFrontend());
}

/** A registry with every built language adapter. */
export function defaultAdapters(): AdapterRegistry {
  return new AdapterRegistry()
    .register(new TypeScriptAdapter())
    .register(new JavaScriptAdapter())
    .register(new PythonAdapter())
    .register(new JavaAdapter())
    .register(new GoAdapter())
    .register(new RustAdapter())
    .register(new CSharpAdapter());
}

/** The full pass pipeline as a Builder. BuilderEngine orders passes by PASS_PRIORITY. */
export class PipelineBuilder implements Builder {
  readonly name = "PipelineBuilder";
  readonly priority = 0;
  supports(): boolean {
    return true;
  }
  passes(): readonly Pass[] {
    return [
      new ImportPass(),
      new CallPass(),
      new RoutePass(),
      new ComponentPass(),
      new SQLPass(),
      new EventPass(),
      new DependencyPass(),
      new CapabilityPass(),
      new ReachabilityPass(),
    ];
  }
}

function listFiles(dir: string, accept: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listFiles(full, accept));
    else if (accept.has(extname(full))) out.push(full);
  }
  return out;
}

function listSourceFiles(dir: string): string[] {
  return listFiles(dir, SOURCE_EXTENSIONS);
}

export interface CompileResult {
  readonly ir: RepositoryIR;
  readonly closure: readonly ClosureResult[];
}

/**
 * Compile a repository directory into a Repository IR and evaluate closure.
 * Deterministic: file traversal is sorted by the OS readdir order (stable per run);
 * the IR draft dedups by id, and the passes/closure are pure.
 */
export async function compileRepository(
  dir: string,
  registry: AdapterRegistry = defaultAdapters(),
): Promise<CompileResult> {
  const logger = new ConsoleLogger("warn");

  // Stage 1 — frontend: parse every supported file with its language adapter.
  const baseCtx: CompilationContext = { repositoryRoot: dir, artifacts: [], parseResults: [], logger };
  const parseResults: ParseResult[] = [];
  for (const file of listSourceFiles(dir)) {
    const adapter = registry.select(file);
    if (!adapter) continue;
    parseResults.push(adapter.parse(file, readFileSync(file, "utf8"), baseCtx));
  }

  // Stage 2 — passes: lift parse results into the Repository IR.
  const ctx: CompilationContext = {
    repositoryRoot: dir,
    artifacts: parseResults.map((p) => p.artifact),
    parseResults,
    logger,
  };
  const ir = await BuilderEngine.fromBuilders([new PipelineBuilder()]).compile(ctx);

  // Stage 3 — closure.
  const closure = new DefaultClosureEngine().evaluate(ir);
  return { ir, closure };
}

/** Extract structure (headings + statements) from every supported document in a directory. */
export function extractDocumentStructures(
  docsDir: string,
  registry: FrontendRegistry = defaultDocumentFrontends(),
): DocumentStructure[] {
  const structures: DocumentStructure[] = [];
  for (const file of listFiles(docsDir, DOC_EXTENSIONS)) {
    const frontend = registry.select(file);
    if (!frontend) continue;
    structures.push(frontend.extract(file, readFileSync(file, "utf8")));
  }
  return structures;
}

/**
 * Compile a documentation directory into the Requirement IR (ADR-0019). Markdown and OpenAPI
 * files are parsed by structure-only frontends, then normalized against the ontology.
 */
export function compileDocuments(
  docsDir: string,
  registry: FrontendRegistry = defaultDocumentFrontends(),
): RequirementSet {
  return new DefaultRequirementNormalizer().normalize(extractDocumentStructures(docsDir, registry));
}

/**
 * Deterministic, proposal-only alias suggestions (document-evolution seam, first tier). For
 * each UNMAPPED requirement-like statement, BM25-rank the existing ontology capabilities. This
 * never maps a statement and never edits the ontology — see evolution/document-ontology-evolution.md.
 */
export function suggestDocumentAliases(
  docsDir: string,
  opts?: SuggestOptions,
  registry: FrontendRegistry = defaultDocumentFrontends(),
): AliasSuggestion[] {
  return suggestAliases(extractDocumentStructures(docsDir, registry), opts);
}

export interface ConsistencyResult extends CompileResult {
  readonly requirements: RequirementSet;
  readonly findings: readonly CrossFinding[];
}

/**
 * Compile code + docs and report doc↔code consistency (ADR-0020). The cross engine joins
 * the Requirement IR and the Repository IR by ontology id; closure state per ontology
 * capability decides whether a documented capability is actually CLOSED.
 */
export async function compileWithDocuments(
  dir: string,
  docsDir: string,
  registry: AdapterRegistry = defaultAdapters(),
): Promise<ConsistencyResult> {
  const { ir, closure } = await compileRepository(dir, registry);
  const requirements = compileDocuments(docsDir);

  const stateById = new Map(closure.map((c) => [c.capabilityId, c.state] as const));
  const closureByCapability = new Map<string, ClosureState>();
  for (const cap of ir.capabilities) {
    const state = stateById.get(cap.id);
    if (state) closureByCapability.set(cap.capability, state);
  }

  const findings = new CrossConsistencyEngine().check(requirements, ir, closureByCapability);
  return { ir, closure, requirements, findings };
}
