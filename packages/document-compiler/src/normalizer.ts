import {
  REQUIREMENT_IR_VERSION,
  type ConstraintIR,
  type EvidenceIR,
  type Priority,
  type RequirementIR,
  type RequirementSet,
} from "@rir/ir";
import { allCapabilities, resolveAlias, type CapabilityDefinition } from "@rir/ontology";
import { makeId } from "@rir/common";
import type { DocumentStructure, ExtractedStatement, RequirementNormalizer } from "./index.js";

function resolveCapability(section: readonly string[], text: string): CapabilityDefinition | undefined {
  const tokens = [...[...section].reverse(), ...text.toLowerCase().split(/[^a-z0-9]+/)].filter(Boolean);
  const caps = allCapabilities();

  // Pass 1 — exact single-token match on capability name or declared alias.
  for (const token of tokens) {
    const t = token.toLowerCase();
    const byName = caps.find((c) => c.name.toLowerCase() === t);
    if (byName) return byName;
    const byAlias = resolveAlias(t);
    if (byAlias) return byAlias;
  }

  // Pass 2 — multi-word capability names (RESET_PASSWORD, VERIFY_EMAIL): match when
  // every name token is present in the statement. Section-scoped tokens rank first.
  const present = new Set(tokens.map((t) => t.toLowerCase()));
  for (const cap of caps) {
    const nameTokens = cap.name.toLowerCase().split("_").filter(Boolean);
    if (nameTokens.length > 1 && nameTokens.every((nt) => present.has(nt))) return cap;
  }
  return undefined;
}

function detectPriority(text: string): Priority {
  const t = text.toLowerCase();
  if (/\bwon'?t\b/.test(t)) return "WONT";
  if (/\bcould\b/.test(t)) return "COULD";
  if (/\bshould\b/.test(t)) return "SHOULD";
  return "MUST";
}

/** Extract constraint key=value pairs that this statement asserts about `cap` (ADR-0017). */
function extractConstraints(cap: CapabilityDefinition, text: string): Array<[string, string]> {
  const lower = text.toLowerCase();
  const out: Array<[string, string]> = [];
  for (const cd of cap.constraints) {
    const keyTokens = cd.key.toLowerCase().split("_");
    if (!keyTokens.some((t) => lower.includes(t))) continue;
    if (cd.type === "ENUM") {
      const v = cd.enumValues.find((value) => lower.includes(value.toLowerCase()));
      if (v) out.push([cd.key, v]);
    } else if (cd.type === "INTEGER") {
      const m = /\b(\d+)\b/.exec(text);
      if (m) out.push([cd.key, m[1]!]);
    } else if (cd.type === "BOOLEAN") {
      out.push([cd.key, /\b(no|not|never|false)\b/i.test(text) ? "FALSE" : "TRUE"]);
    }
  }
  return out;
}

interface Acc {
  feature: string;
  capability: string;
  constraints: Map<string, string>;
  outputs: Set<string>;
  priority: Priority;
  evidence: EvidenceIR[];
}

/**
 * DefaultRequirementNormalizer (TSPEC-DN01). Maps extracted statements onto the shared
 * ontology, producing Requirement IR. Deterministic; statements that bind to no ontology
 * capability are skipped (never guessed). See ADR-0017.
 */
export class DefaultRequirementNormalizer implements RequirementNormalizer {
  normalize(structures: readonly DocumentStructure[]): RequirementSet {
    const byCap = new Map<string, Acc>();

    for (const struct of structures) {
      for (const stmt of struct.statements) {
        const cap = resolveCapability(stmt.section, stmt.text);
        if (!cap) continue;
        const acc = this.accFor(byCap, cap);
        for (const [k, v] of extractConstraints(cap, stmt.text)) {
          if (!acc.constraints.has(k)) acc.constraints.set(k, v);
        }
        for (const o of cap.outputs)
          if (stmt.text.toLowerCase().includes(o.toLowerCase())) acc.outputs.add(o);
        acc.priority = detectPriority(stmt.text);
        acc.evidence.push(this.evidence(struct, stmt));
      }
    }

    return {
      version: REQUIREMENT_IR_VERSION,
      requirements: [...byCap.values()].map((a) => this.toRequirement(a)),
    };
  }

  private accFor(byCap: Map<string, Acc>, cap: CapabilityDefinition): Acc {
    let acc = byCap.get(cap.id);
    if (!acc) {
      acc = {
        feature: cap.id.split(".")[0]!,
        capability: cap.id,
        constraints: new Map(),
        outputs: new Set(),
        priority: "MUST",
        evidence: [],
      };
      byCap.set(cap.id, acc);
    }
    return acc;
  }

  private evidence(struct: DocumentStructure, stmt: ExtractedStatement): EvidenceIR {
    return { source: "DOCUMENTATION", locator: `${struct.artifact.path}#${stmt.ordinal}`, confidence: 1 };
  }

  private toRequirement(a: Acc): RequirementIR {
    const constraints: ConstraintIR[] = [...a.constraints].map(([key, value]) => ({
      key,
      value,
      evidence: a.evidence,
    }));
    return {
      id: makeId("req", a.capability),
      feature: a.feature,
      capability: a.capability,
      constraints,
      outputs: [...a.outputs],
      priority: a.priority,
      evidence: a.evidence,
    };
  }
}
