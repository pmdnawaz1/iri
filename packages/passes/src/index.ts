/**
 * @rir/passes — Compiler passes (one responsibility each).
 *
 * This package declares the canonical pass roster and their fixed priorities. Each
 * pass is deterministic and idempotent and contributes facts to the IRDraft. The
 * roster and ordering are architectural; implementers fill in pass bodies but must
 * NOT add, remove, or reorder passes here.
 *
 * The roster + base class live in ./base.ts so pass files can import them without
 * importing this barrel (which re-exports the passes). See base.ts.
 */

export { PASS_NAMES, PASS_PRIORITY, AbstractPass, type PassName } from "./base.js";

// Implemented passes (architect-wired registration). The BuilderEngine orders them
// by PASS_PRIORITY, so listing order here does not matter.
export { ImportPass } from "./ImportPass.js";
export { CallPass } from "./CallPass.js";
export { RoutePass } from "./RoutePass.js";
export { DependencyPass } from "./DependencyPass.js";
export { CapabilityPass } from "./CapabilityPass.js";
export { ReachabilityPass } from "./ReachabilityPass.js";
