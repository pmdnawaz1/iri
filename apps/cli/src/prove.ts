/**
 * Proving slice: compile a real backend directory and run the closure engine.
 *
 * Delegates to the real compiler pipeline (adapters -> passes -> IR -> closure)
 * instead of duplicating AST extraction. The IR and closure engine are the real ones.
 */

import { compileRepository } from "@rir/compiler";
import type { ClosureResult } from "@rir/closure";
import type { RepositoryIR } from "@rir/ir";

export interface ProveResult {
  readonly directory: string;
  readonly fileCount: number;
  readonly ir: RepositoryIR;
  readonly results: readonly ClosureResult[];
  readonly reachableChain: readonly string[];
}

export async function prove(dir: string): Promise<ProveResult> {
  const { ir, closure } = await compileRepository(dir);
  const reachableChain = ir.nodes
    .filter((n) => n.execution.reachable)
    .map((n) => `${n.kind}:${n.name}`);
  return {
    directory: dir,
    fileCount: ir.artifacts.length,
    ir,
    results: closure,
    reachableChain,
  };
}
