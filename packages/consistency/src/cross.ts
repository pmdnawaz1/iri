/**
 * CrossConsistencyEngine (TSPEC-E07 / ADR-0020) — joins the Requirement IR (docs) and the
 * Repository IR (code) by ontology id and reports doc↔code findings. Pure set logic; no AI.
 */

import type { ClosureState, RepositoryIR, RequirementSet } from "@rir/ir";

export const CrossFindingCode = {
  Unimplemented: "UNIMPLEMENTED",
  Undocumented: "UNDOCUMENTED",
  ConstraintMismatch: "CONSTRAINT_MISMATCH",
  MissingConstraint: "MISSING_CONSTRAINT",
} as const;
export type CrossFindingCode = (typeof CrossFindingCode)[keyof typeof CrossFindingCode];

export interface CrossFinding {
  readonly code: CrossFindingCode;
  readonly severity: "ERROR" | "WARNING";
  readonly capability: string;
  readonly message: string;
}

export class CrossConsistencyEngine {
  /**
   * @param requirements          Requirement IR compiled from documents.
   * @param ir                    Repository IR compiled from code.
   * @param closureByCapability   ontology capability id -> its closure state.
   */
  check(
    requirements: RequirementSet,
    ir: RepositoryIR,
    closureByCapability: ReadonlyMap<string, ClosureState>,
  ): readonly CrossFinding[] {
    const findings: CrossFinding[] = [];
    const implByCap = new Map(
      ir.capabilities.filter((c) => c.feature !== "UNMAPPED").map((c) => [c.capability, c]),
    );
    const documented = new Set(requirements.requirements.map((r) => r.capability));

    for (const req of requirements.requirements) {
      const severity = req.priority === "MUST" ? "ERROR" : "WARNING";
      const impl = implByCap.get(req.capability);
      if (!impl) {
        findings.push({
          code: "UNIMPLEMENTED",
          severity,
          capability: req.capability,
          message: "documented but not implemented in the code",
        });
        continue;
      }
      const state = closureByCapability.get(req.capability);
      if (state && state !== "CLOSED") {
        findings.push({
          code: "UNIMPLEMENTED",
          severity,
          capability: req.capability,
          message: `documented but the implementation is ${state}, not CLOSED`,
        });
      }
      const codeConstraints = new Map(impl.constraints.map((c) => [c.key, c.value]));
      for (const rc of req.constraints) {
        const codeVal = codeConstraints.get(rc.key);
        if (codeVal === undefined) {
          findings.push({
            code: "MISSING_CONSTRAINT",
            severity: "WARNING",
            capability: req.capability,
            message: `docs require ${rc.key}=${rc.value}; the code declares no such constraint`,
          });
        } else if (codeVal !== rc.value) {
          findings.push({
            code: "CONSTRAINT_MISMATCH",
            severity: "ERROR",
            capability: req.capability,
            message: `${rc.key}: docs say ${rc.value}, code says ${codeVal}`,
          });
        }
      }
    }

    for (const cap of ir.capabilities) {
      if (cap.feature === "UNMAPPED") continue;
      if (!documented.has(cap.capability)) {
        findings.push({
          code: "UNDOCUMENTED",
          severity: "WARNING",
          capability: cap.capability,
          message: "implemented in the code but not documented",
        });
      }
    }

    return findings;
  }
}
