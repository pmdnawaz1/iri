/**
 * @rir/coverage — Coverage engine.
 *
 * Computes deterministic coverage ratios over the Repository IR and Requirement IR.
 * The DEFINITION of each coverage dimension is architect-owned; the computation is
 * pure arithmetic over canonical facts. No inference.
 */

import { ClosureState, type CapabilityIR, type RepositoryIR, type RequirementSet } from "@rir/ir";
import { allCapabilities } from "@rir/ontology";

/** A single coverage ratio with its raw counts. */
export interface CoverageRatio {
  readonly covered: number;
  readonly total: number;
  /** covered / total, or 1 when total is 0 (vacuously complete). */
  readonly ratio: number;
}

/** The full coverage report across all dimensions. */
export interface CoverageReport {
  readonly requirement: CoverageRatio;
  readonly implementation: CoverageRatio;
  readonly documentation: CoverageRatio;
  readonly test: CoverageRatio;
  readonly capability: CoverageRatio;
}

function ratio(covered: number, total: number): CoverageRatio {
  return { covered, total, ratio: total === 0 ? 1 : covered / total };
}

/** Engine contract. */
export interface CoverageEngine {
  compute(ir: RepositoryIR, requirements: RequirementSet): CoverageReport;
}

/** Reference implementation: deterministic counting over canonical facts. */
export class DefaultCoverageEngine implements CoverageEngine {
  compute(ir: RepositoryIR, requirements: RequirementSet): CoverageReport {
    const implemented = new Set(ir.capabilities.map((c) => c.capability));

    // Requirement coverage: required capabilities that have an implementation.
    const requiredCaps = new Set(requirements.requirements.map((r) => r.capability));
    const requirementCovered = [...requiredCaps].filter((c) => implemented.has(c)).length;

    // Implementation coverage: implemented capabilities that reach CLOSED.
    const closed = ir.capabilities.filter((c) => c.closure === ClosureState.Closed).length;

    // Documentation coverage: implemented capabilities that are also required (documented).
    const documented = ir.capabilities.filter((c) => requiredCaps.has(c.capability)).length;

    // Test coverage: capabilities whose participating nodes include a tested node.
    const tested = ir.capabilities.filter((c) => isTested(c, ir)).length;

    // Capability coverage: ontology capabilities present in the repository.
    const ontologyTotal = allCapabilities().length;

    return {
      requirement: ratio(requirementCovered, requiredCaps.size),
      implementation: ratio(closed, ir.capabilities.length),
      documentation: ratio(documented, ir.capabilities.length),
      test: ratio(tested, ir.capabilities.length),
      capability: ratio(implemented.size, ontologyTotal),
    };
  }
}

function isTested(capability: CapabilityIR, ir: RepositoryIR): boolean {
  const nodes = new Map(ir.nodes.map((n) => [n.id, n]));
  return capability.nodes.some((id) => nodes.get(id)?.execution.tested === true);
}
