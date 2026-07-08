/**
 * GuardClosureEngine (TSPEC-A024 / ADR-0024, GAPS-v2 V5) — negative-space closure.
 *
 * Execution closure proves a capability's path is connected; it cannot express what MUST be
 * present for SECURITY: a capability that requires authentication must traverse an auth/
 * authorization guard before it reaches data. This engine checks that policy deterministically
 * over the Repository IR.
 *
 * Guard detection (G-3 improvement):
 *   1. Name-based: node name matched against known auth/guard patterns (regex).
 *   2. Kind-based: node kind is MIDDLEWARE (CallPass classifies *Middleware, *Auth, *Guard as
 *      MIDDLEWARE nodes).
 *   3. Edge-based: a WRAPS edge exists involving a node in the capability's subgraph (a
 *      middleware wrapping a route/handler).
 */

import type { EdgeIR, NodeIR, RepositoryIR } from "@rir/ir";
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

/** Check for MIDDLEWARE node kind (CallPass classifies *Auth, *Guard, *Middleware as MIDDLEWARE). */
function hasMiddlewareKind(nodes: readonly NodeIR[]): boolean {
  return nodes.some((n) => n.kind === "MIDDLEWARE");
}

/** Check for WRAPS edges connecting a middleware to any node in the capability. Handles the
 *  case where the middleware node itself isn't in the capability's direct node list but wraps
 *  a route/controller that is (e.g. a global guard). */
function hasWrapsEdge(nodes: readonly NodeIR[], edges: readonly EdgeIR[]): boolean {
  const nodeIds = new Set(nodes.map((n) => n.id));
  return edges.some(
    (e) =>
      e.kind === "WRAPS" &&
      (nodeIds.has(e.from) || nodeIds.has(e.to)),
  );
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

      // Multi-method guard detection (G-3): name pattern, node kind, WRAPS edges
      const hasGuard =
        hasGuardSignal(nodes) || hasMiddlewareKind(nodes) || hasWrapsEdge(nodes, ir.edges);

      if (!hasGuard) {
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
