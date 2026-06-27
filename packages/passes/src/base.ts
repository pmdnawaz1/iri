/**
 * @rir/passes — roster + base class.
 *
 * Kept in its own module (not the barrel) so the individual pass files can import
 * `AbstractPass`/`PASS_PRIORITY` from here WITHOUT importing the package barrel, which
 * re-exports the passes. Importing the barrel from a pass file creates a runtime
 * initialization cycle under Node ESM.
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
