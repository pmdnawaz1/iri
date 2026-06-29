/**
 * CrossConsistencyEngine (TSPEC-E07 / ADR-0020, extended by ADR-0024) — joins the Requirement IR
 * (docs) and the Repository IR (code) by ontology id and reports doc↔code findings. Pure set
 * logic; no AI. GAPS-v2 additions: a `ScopeManifest` filter (V10) so findings are only emitted
 * for what the product claims to be, and a `criticality` weight (V8) on every finding.
 */

import type { ClosureState, RepositoryIR, RequirementSet, ScopeManifest } from "@rir/ir";
import { Criticality, getCriticality } from "@rir/ontology";

export const CrossFindingCode = {
  Unimplemented: "UNIMPLEMENTED",
  Undocumented: "UNDOCUMENTED",
  ConstraintMismatch: "CONSTRAINT_MISMATCH",
  MissingConstraint: "MISSING_CONSTRAINT",
  /** A documented requirement that binds to no ontology capability (needs evolution). */
  DocUnmapped: "DOC_UNMAPPED",
  /** Implemented + CLOSED but outside the declared scope (scope creep). */
  OutOfScope: "OUT_OF_SCOPE",
} as const;
export type CrossFindingCode = (typeof CrossFindingCode)[keyof typeof CrossFindingCode];

export interface CrossFinding {
  readonly code: CrossFindingCode;
  readonly severity: "ERROR" | "WARNING";
  readonly capability: string;
  /** Business criticality of the capability (GAPS-v2 V8) — for sorting/gating. */
  readonly criticality: Criticality;
  readonly message: string;
}

/** True when the capability is within the declared scope (or no scope is declared). */
function inScope(capabilityId: string, scope?: ScopeManifest): boolean {
  if (!scope) return true;
  const feature = capabilityId.split(".")[0] ?? "";
  return Boolean(scope.features?.includes(feature) || scope.capabilities?.includes(capabilityId));
}

export class CrossConsistencyEngine {
  /**
   * @param requirements          Requirement IR compiled from documents.
   * @param ir                    Repository IR compiled from code.
   * @param closureByCapability   ontology capability id -> its closure state.
   * @param scope                 optional declared scope; filters out-of-scope findings (V10).
   */
  check(
    requirements: RequirementSet,
    ir: RepositoryIR,
    closureByCapability: ReadonlyMap<string, ClosureState>,
    scope?: ScopeManifest,
  ): readonly CrossFinding[] {
    const findings: CrossFinding[] = [];
    const add = (
      code: CrossFindingCode,
      severity: "ERROR" | "WARNING",
      capability: string,
      message: string,
    ): void => {
      findings.push({ code, severity, capability, criticality: getCriticality(capability), message });
    };

    const implByCap = new Map(
      ir.capabilities.filter((c) => c.feature !== "UNMAPPED").map((c) => [c.capability, c]),
    );
    const documented = new Set(requirements.requirements.map((r) => r.capability));

    for (const req of requirements.requirements) {
      const severity = req.priority === "MUST" ? "ERROR" : "WARNING";

      // A documented requirement the ontology cannot place: an evolution signal (always reported,
      // scope-independent — you can't scope what the ontology can't name).
      if (req.feature === "UNMAPPED") {
        add(
          "DOC_UNMAPPED",
          "WARNING",
          req.capability,
          "documented requirement maps to no ontology capability (needs ontology evolution)",
        );
        continue;
      }
      if (!inScope(req.capability, scope)) continue;

      const impl = implByCap.get(req.capability);
      if (!impl) {
        add("UNIMPLEMENTED", severity, req.capability, "documented but not implemented in the code");
        continue;
      }
      const state = closureByCapability.get(req.capability);
      if (state && state !== "CLOSED") {
        add(
          "UNIMPLEMENTED",
          severity,
          req.capability,
          `documented but the implementation is ${state}, not CLOSED`,
        );
      }
      const codeConstraints = new Map(impl.constraints.map((c) => [c.key, c.value]));
      for (const rc of req.constraints) {
        const codeVal = codeConstraints.get(rc.key);
        if (codeVal === undefined) {
          add(
            "MISSING_CONSTRAINT",
            "WARNING",
            req.capability,
            `docs require ${rc.key}=${rc.value}; the code declares no such constraint`,
          );
        } else if (codeVal !== rc.value) {
          add(
            "CONSTRAINT_MISMATCH",
            "ERROR",
            req.capability,
            `${rc.key}: docs say ${rc.value}, code says ${codeVal}`,
          );
        }
      }
    }

    for (const cap of ir.capabilities) {
      if (cap.feature === "UNMAPPED") continue;
      if (documented.has(cap.capability)) continue;
      if (inScope(cap.capability, scope)) {
        add("UNDOCUMENTED", "WARNING", cap.capability, "implemented in the code but not documented");
      } else {
        // Implemented something the product did not claim — surface as low-severity scope creep.
        add(
          "OUT_OF_SCOPE",
          "WARNING",
          cap.capability,
          "implemented but outside the declared scope (rir.scope.yaml)",
        );
      }
    }

    return findings;
  }
}
