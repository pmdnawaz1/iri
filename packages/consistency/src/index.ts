/**
 * @rir/consistency — Consistency engine.
 *
 * Performs deterministic graph validation and reports findings. The DEFINITION of
 * what constitutes a conflict/mismatch is architect-owned; detection is pure. The
 * engine never resolves conflicts and never edits the IR — it reports.
 */

import { type CapabilityIR, type ConstraintIR, type RepositoryIR } from "@rir/ir";
import { getCapability, type ConstraintType } from "@rir/ontology";

export { CrossConsistencyEngine, CrossFindingCode, type CrossFinding } from "./cross.js";
export { GuardClosureEngine, type GuardFinding } from "./guard.js";
export { DeadCodeEngine, type DeadCodeFinding } from "./dead.js";

/** Severity of a consistency finding. */
export const Severity = {
  Error: "ERROR",
  Warning: "WARNING",
} as const;
export type Severity = (typeof Severity)[keyof typeof Severity];

/** Stable codes for each detectable inconsistency. */
export const FindingCode = {
  ConstraintConflict: "CONSTRAINT_CONFLICT",
  DuplicateCapability: "DUPLICATE_CAPABILITY",
  UnknownCapability: "UNKNOWN_CAPABILITY",
  UnknownConstraintKey: "UNKNOWN_CONSTRAINT_KEY",
  InvalidConstraintValue: "INVALID_CONSTRAINT_VALUE",
  BrokenReference: "BROKEN_REFERENCE",
} as const;
export type FindingCode = (typeof FindingCode)[keyof typeof FindingCode];

/** A single deterministic consistency finding. */
export interface Finding {
  readonly code: FindingCode;
  readonly severity: Severity;
  readonly message: string;
  /** Ids (capability/node/edge) the finding refers to, for provenance. */
  readonly subjects: readonly string[];
}

/** Engine contract. */
export interface ConsistencyEngine {
  check(ir: RepositoryIR): readonly Finding[];
}

/** Reference implementation: deterministic checks against IR + ontology. */
export class DefaultConsistencyEngine implements ConsistencyEngine {
  check(ir: RepositoryIR): readonly Finding[] {
    const findings: Finding[] = [];
    const nodeIds = new Set(ir.nodes.map((n) => n.id));

    // Broken edge references.
    for (const edge of ir.edges) {
      if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
        findings.push({
          code: FindingCode.BrokenReference,
          severity: Severity.Error,
          message: `Edge ${edge.id} (${edge.kind}) references a missing node.`,
          subjects: [edge.id, edge.from, edge.to],
        });
      }
    }

    // Capability membership references.
    for (const cap of ir.capabilities) {
      for (const member of cap.nodes) {
        if (!nodeIds.has(member)) {
          findings.push({
            code: FindingCode.BrokenReference,
            severity: Severity.Error,
            message: `Capability ${cap.id} references missing node ${member}.`,
            subjects: [cap.id, member],
          });
        }
      }
      findings.push(...checkCapabilityAgainstOntology(cap));
    }

    // Duplicate capability ids bound to the same ontology capability.
    findings.push(...findDuplicates(ir.capabilities));
    return findings;
  }
}

function checkCapabilityAgainstOntology(cap: CapabilityIR): Finding[] {
  const findings: Finding[] = [];
  const def = getCapability(cap.capability);
  if (!def) {
    findings.push({
      code: FindingCode.UnknownCapability,
      severity: Severity.Error,
      message: `Capability ${cap.id} binds to unknown ontology id ${cap.capability}.`,
      subjects: [cap.id],
    });
    return findings;
  }

  const defByKey = new Map(def.constraints.map((c) => [c.key, c]));
  const seen = new Map<string, string>();
  for (const c of cap.constraints) {
    const cdef = defByKey.get(c.key);
    if (!cdef) {
      findings.push({
        code: FindingCode.UnknownConstraintKey,
        severity: Severity.Warning,
        message: `Capability ${cap.id} declares unknown constraint key ${c.key}.`,
        subjects: [cap.id],
      });
      continue;
    }
    if (!isValidConstraintValue(cdef.type, cdef.enumValues, c.value)) {
      findings.push({
        code: FindingCode.InvalidConstraintValue,
        severity: Severity.Error,
        message: `Capability ${cap.id} constraint ${c.key}=${c.value} is invalid for type ${cdef.type}.`,
        subjects: [cap.id],
      });
    }
    // Contradicting values for the same key within one capability.
    const prior = seen.get(c.key);
    if (prior !== undefined && prior !== c.value) {
      findings.push({
        code: FindingCode.ConstraintConflict,
        severity: Severity.Error,
        message: `Capability ${cap.id} has conflicting values for ${c.key}: ${prior} vs ${c.value}.`,
        subjects: [cap.id],
      });
    }
    seen.set(c.key, c.value);
  }
  return findings;
}

function isValidConstraintValue(type: ConstraintType, enumValues: readonly string[], value: string): boolean {
  switch (type) {
    case "ENUM":
      return enumValues.includes(value);
    case "BOOLEAN":
      return value === "TRUE" || value === "FALSE";
    case "INTEGER":
      return /^-?\d+$/.test(value);
    case "STRING":
      return true;
    default:
      return false;
  }
}

function findDuplicates(capabilities: readonly CapabilityIR[]): Finding[] {
  const byCapability = new Map<string, string[]>();
  for (const cap of capabilities) {
    const list = byCapability.get(cap.capability) ?? [];
    list.push(cap.id);
    byCapability.set(cap.capability, list);
  }
  const findings: Finding[] = [];
  for (const [capability, ids] of byCapability) {
    if (ids.length > 1) {
      findings.push({
        code: FindingCode.DuplicateCapability,
        severity: Severity.Warning,
        message: `Ontology capability ${capability} is implemented ${ids.length} times.`,
        subjects: ids,
      });
    }
  }
  return findings;
}

export type { ConstraintIR };
