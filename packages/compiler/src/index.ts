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
  DependencyPass,
  ImportPass,
  ReachabilityPass,
  RoutePass,
} from "@rir/passes";
import { DefaultClosureEngine, type ClosureResult } from "@rir/closure";
import type { Builder, CompilationContext, Pass } from "@rir/core";
import type { RepositoryIR } from "@rir/ir";

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
      new DependencyPass(),
      new CapabilityPass(),
      new ReachabilityPass(),
    ];
  }
}

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listSourceFiles(full));
    else if (SOURCE_EXTENSIONS.has(extname(full))) out.push(full);
  }
  return out;
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
