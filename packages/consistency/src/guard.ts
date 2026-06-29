/**
 * GuardClosureEngine (TSPEC-A024 / ADR-0024, GAPS-v2 V5) — negative-space closure.
 *
 * Execution closure proves a capability's path is connected; it cannot express what MUST be
 * present for SECURITY: a capability that requires authentication must traverse an auth/
 * authorization guard before it reaches data. This engine checks that policy deterministically
 * over the Repository IR. First cut: a guard is recognized by node naming (no AI). It reports
 * the *absence* of a required guard — the one class of finding execution closure structurally
 * cannot produce.
 */

import type { NodeIR, RepositoryIR } from "@rir/ir";
import { Criticality, getCriticality, requiresAuth } from "@rir/ontology";

export interface GuardFinding {
  readonly code: "GUARD_MISSING";
  readonly severity: "ERROR" | "WARNING";
  readonly capability: string;
  readonly criticality: Criticality;
  readonly message: string;
}

// Deterministic guard signals in a node's name. Conservative: matches common auth/authorization
// middleware, decorators, and helpers across Express/Nest/Fastify/etc.
const GUARD_PATTERN =
  /auth|guard|authenticated|authorize|authorization|jwt|bearer|session|require.?auth|is.?auth|current.?user|use.?guards|permission|rbac|acl|verify.?token/i;

function hasGuardSignal(nodes: readonly NodeIR[]): boolean {
  return nodes.some((n) => GUARD_PATTERN.test(n.name));
}

export class GuardClosureEngine {
  /**
   * Report capabilities that are implemented (have a backend route) and require auth by policy,
   * yet show no guard node anywhere in their subgraph. Severity rises with criticality.
   */
  check(ir: RepositoryIR): readonly GuardFinding[] {
    const nodesById = new Map(ir.nodes.map((n) => [n.id, n] as const));
    const findings: GuardFinding[] = [];

    for (const cap of ir.capabilities) {
      if (cap.feature === "UNMAPPED") continue;
      if (!requiresAuth(cap.capability)) continue;

      const nodes = cap.nodes.map((id) => nodesById.get(id)).filter((n): n is NodeIR => n !== undefined);
      const hasRoute = nodes.some((n) => n.kind === "ROUTE" || n.kind === "FRONTEND_ROUTE");
      if (!hasRoute) continue; // not actually exposed in this repo — nothing to guard

      if (!hasGuardSignal(nodes)) {
        const criticality = getCriticality(cap.capability);
        findings.push({
          code: "GUARD_MISSING",
          severity: criticality === "CRITICAL" || criticality === "HIGH" ? "ERROR" : "WARNING",
          capability: cap.capability,
          criticality,
          message: "requires authentication but no auth/authorization guard was found on its path",
        });
      }
    }
    return findings;
  }
}
