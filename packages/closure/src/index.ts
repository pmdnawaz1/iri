/**
 * @rir/closure — Execution Closure engine (the core innovation).
 *
 * A capability is complete only if its execution path is complete. Existence is
 * insufficient: connectivity, execution, and verification are required. This package
 * compares a capability's ontology `expectedChain` against the stages actually
 * present (and reachable) in the Repository IR and yields a deterministic state.
 *
 * The decision is pure and deterministic — no AI, no heuristics. The closure RULES
 * are architect-owned; their implementation here is the canonical reference.
 */

import { ClosureState, NodeKind, type CapabilityIR, type NodeIR, type RepositoryIR } from "@rir/ir";
import { ExecutionStage, type ExecutionTier, getCapability, tierOfStage } from "@rir/ontology";

/** Canonical mapping from a Repository IR node kind onto an ontology execution stage.
 *  Node kinds without a stage (e.g. Variable, Test) do not participate in closure. */
const STAGE_OF_NODE_KIND: Partial<Record<NodeKind, ExecutionStage>> = {
  [NodeKind.Route]: ExecutionStage.BackendRoute,
  [NodeKind.Controller]: ExecutionStage.Controller,
  [NodeKind.Service]: ExecutionStage.Service,
  [NodeKind.Repository]: ExecutionStage.Repository,
  [NodeKind.Component]: ExecutionStage.Component,
  [NodeKind.Handler]: ExecutionStage.Handler,
  [NodeKind.ApiCall]: ExecutionStage.ApiCall,
  [NodeKind.SqlQuery]: ExecutionStage.Database,
  [NodeKind.Table]: ExecutionStage.Database,
  [NodeKind.Response]: ExecutionStage.Response,
  [NodeKind.FrontendRoute]: ExecutionStage.FrontendRoute,
  [NodeKind.FrontendState]: ExecutionStage.FrontendState,
  [NodeKind.RenderedUi]: ExecutionStage.RenderedUi,
  [NodeKind.Worker]: ExecutionStage.Worker,
  [NodeKind.Entrypoint]: ExecutionStage.Entrypoint,
};

export function stageOfNodeKind(kind: NodeKind): ExecutionStage | undefined {
  return STAGE_OF_NODE_KIND[kind];
}

/** Outcome of evaluating one capability's execution closure. */
export interface ClosureResult {
  readonly capabilityId: string;
  readonly state: ClosureState;
  /** Ontology stages that were expected. */
  readonly expected: readonly ExecutionStage[];
  /** Expected stages found present (mapped from reachable nodes). */
  readonly present: readonly ExecutionStage[];
  /** Expected stages that are missing (ordered as in the expected chain). */
  readonly missing: readonly ExecutionStage[];
  /**
   * Weakest-link evidence confidence in [0,1] across the participating nodes (GAPS-v2 V3).
   * A `CLOSED` built on inference (low confidence) is no longer indistinguishable from one
   * proven by AST-grade facts. ORPHAN/no-evidence capabilities are 0.
   */
  readonly confidence: number;
}

/** The weakest (minimum) evidence confidence across a set of nodes; 0 when there is none. */
function weakestConfidence(nodes: readonly NodeIR[]): number {
  let min = nodes.length === 0 ? 0 : 1;
  for (const node of nodes) {
    for (const ev of node.evidence) min = Math.min(min, ev.confidence);
    if (node.evidence.length === 0) min = Math.min(min, 0.5); // present but unevidenced
  }
  return min;
}

/**
 * Deterministically classify a capability's closure.
 *
 * Rules (in priority order):
 *   - CONFLICTING: caller-supplied; surfaced by the consistency engine, never inferred here.
 *   - ORPHAN:      the capability has no participating nodes at all.
 *   - UNREACHABLE: nodes exist but none are reachable from an entrypoint.
 *   - CLOSED:      every expected stage is present.
 *   - PARTIAL:     the first expected stage is present but later stages are missing.
 *   - BROKEN:      some stage is present but an earlier required stage is missing
 *                  (the chain is interrupted).
 */
export function evaluateClosure(
  capability: CapabilityIR,
  nodesById: ReadonlyMap<string, NodeIR>,
): ClosureResult {
  const def = getCapability(capability.capability);
  const expected: readonly ExecutionStage[] = def?.expectedChain ?? [];

  // Unknown to the ontology (e.g. an UNMAPPED capability): cannot be evaluated — ORPHAN.
  if (!def) {
    return {
      capabilityId: capability.id,
      state: ClosureState.Orphan,
      expected: [],
      present: [],
      missing: [],
      confidence: 0,
    };
  }

  if (capability.closure === ClosureState.Conflicting) {
    return {
      capabilityId: capability.id,
      state: ClosureState.Conflicting,
      expected,
      present: [],
      missing: expected,
      confidence: 0,
    };
  }

  const participating = capability.nodes
    .map((id) => nodesById.get(id))
    .filter((n): n is NodeIR => n !== undefined);

  if (participating.length === 0) {
    return {
      capabilityId: capability.id,
      state: ClosureState.Orphan,
      expected,
      present: [],
      missing: expected,
      confidence: 0,
    };
  }

  const reachable = participating.filter((n) => n.execution.reachable);
  if (reachable.length === 0) {
    return {
      capabilityId: capability.id,
      state: ClosureState.Unreachable,
      expected,
      present: [],
      missing: expected,
      confidence: weakestConfidence(participating),
    };
  }

  const presentStages = new Set<ExecutionStage>();
  for (const node of reachable) {
    const stage = stageOfNodeKind(node.kind);
    if (stage) presentStages.add(stage);
  }

  // Tier-aware (ADR-0019): only require stages whose tier is actually present in the repo.
  // A backend-only repo is judged on its BACKEND subchain, not the full-stack chain.
  const presentTiers = new Set<ExecutionTier>();
  for (const s of presentStages) presentTiers.add(tierOfStage(s));

  const requiredStages = expected.filter((s) => presentTiers.has(tierOfStage(s)));
  const present = expected.filter((s) => presentStages.has(s));

  // G2 / GAPS-FULL: optional stages can be absent without preventing CLOSED.
  // When a stage is in `optionalStages`, its absence is tolerated — the chain
  // can still close if all non-optional stages are present. This handles
  // frameworks like FastAPI that skip SERVICE/REPOSITORY layers.
  const optionalSet = new Set(def.optionalStages ?? []);
  const missing = requiredStages.filter((s) => !presentStages.has(s) && !optionalSet.has(s));

  let state: ClosureState;
  if (missing.length === 0) {
    state = ClosureState.Closed;
  } else if (isChainInterrupted(requiredStages, presentStages)) {
    state = ClosureState.Broken;
  } else {
    state = ClosureState.Partial;
  }

  return {
    capabilityId: capability.id,
    state,
    expected,
    present,
    missing,
    confidence: weakestConfidence(reachable),
  };
}

/** A chain is BROKEN (not merely PARTIAL) when a present stage follows a missing one,
 *  i.e. execution resumes after a gap rather than simply stopping short. */
function isChainInterrupted(
  expected: readonly ExecutionStage[],
  present: ReadonlySet<ExecutionStage>,
): boolean {
  let seenMissing = false;
  for (const stage of expected) {
    if (present.has(stage)) {
      if (seenMissing) return true;
    } else {
      seenMissing = true;
    }
  }
  return false;
}

/** Engine contract. Implementations evaluate every capability in a Repository IR. */
export interface ClosureEngine {
  evaluate(ir: RepositoryIR): readonly ClosureResult[];
}

/** Reference implementation: pure, deterministic, iterates all capabilities. */
export class DefaultClosureEngine implements ClosureEngine {
  evaluate(ir: RepositoryIR): readonly ClosureResult[] {
    const nodesById = new Map(ir.nodes.map((n) => [n.id, n]));
    return ir.capabilities.map((cap) => evaluateClosure(cap, nodesById));
  }
}
