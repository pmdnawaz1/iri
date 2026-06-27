/**
 * @rir/passes — Compiler passes (one responsibility each).
 *
 * This package declares the canonical pass roster and their fixed priorities. Each
 * pass is deterministic and idempotent and contributes facts to the IRDraft. The
 * roster and ordering are architectural; implementers fill in pass bodies but must
 * NOT add, remove, or reorder passes here.
 */

import type { Pass } from "@rir/core";

/** Canonical pass names. Order of declaration is the canonical execution order. */
export const PASS_NAMES = [
  "ImportPass",
  "CallPass",
  "RoutePass",
  "ComponentPass",
  "SQLPass",
  "EventPass",
  "DependencyPass",
  "OwnershipPass",
  "CapabilityPass",
  "ConstraintPass",
  "FlowPass",
  "ReachabilityPass",
  "DocumentationPass",
  "RuntimePass",
  "GitPass",
] as const;

export type PassName = (typeof PASS_NAMES)[number];

/** Canonical priority for each pass (ascending = earlier). */
export const PASS_PRIORITY: Readonly<Record<PassName, number>> = Object.freeze(
  Object.fromEntries(PASS_NAMES.map((name, index) => [name, (index + 1) * 10])) as Record<PassName, number>,
);

/** Base class capturing the shared shape of every pass. */
export abstract class AbstractPass implements Pass {
  abstract readonly name: PassName;
  get priority(): number {
    return PASS_PRIORITY[this.name];
  }
  supports(): boolean {
    return true;
  }
  abstract run(...args: Parameters<Pass["run"]>): ReturnType<Pass["run"]>;
}
