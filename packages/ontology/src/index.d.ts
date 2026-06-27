/**
 * @rir/ontology — Canonical capability ontology.
 *
 * The ontology describes SOFTWARE concepts (AUTH.LOGIN), never FRAMEWORK concepts
 * (ExpressLoginRoute). It is shared across all repositories. Only the high-reasoning
 * AI may introduce, rename, or deprecate ontology concepts; doing so is a versioned
 * change. Capability discovery binds repository nodes to these ids; it never invents
 * new ids and never maps aliases that are not declared here (e.g. "signin" -> LOGIN
 * is only valid because it is listed in `aliases`).
 */
export declare const ONTOLOGY_VERSION: "1.0.0";
/**
 * Canonical execution stages. A capability's `expectedChain` is an ordered list of
 * these stages; the Closure engine maps Repository IR node kinds onto stages to
 * decide whether the path is CLOSED. Stages are ontology-owned, not IR-owned.
 */
export declare const ExecutionStage: {
    readonly FrontendRoute: "FRONTEND_ROUTE";
    readonly Component: "COMPONENT";
    readonly Handler: "HANDLER";
    readonly ApiCall: "API_CALL";
    readonly BackendRoute: "BACKEND_ROUTE";
    readonly Controller: "CONTROLLER";
    readonly Service: "SERVICE";
    readonly Repository: "REPOSITORY";
    readonly Database: "DATABASE";
    readonly Response: "RESPONSE";
    readonly FrontendState: "FRONTEND_STATE";
    readonly RenderedUi: "RENDERED_UI";
};
export type ExecutionStage = (typeof ExecutionStage)[keyof typeof ExecutionStage];
/** The kind of value a constraint key accepts. */
export declare const ConstraintType: {
    readonly Enum: "ENUM";
    readonly Boolean: "BOOLEAN";
    readonly Integer: "INTEGER";
    readonly String: "STRING";
};
export type ConstraintType = (typeof ConstraintType)[keyof typeof ConstraintType];
/** Definition of a single constraint a capability may carry. */
export interface ConstraintDefinition {
    readonly key: string;
    readonly type: ConstraintType;
    /** Allowed values when `type` is ENUM; empty otherwise. */
    readonly enumValues: readonly string[];
    /** Whether a CLOSED capability of this kind must declare the constraint. */
    readonly required: boolean;
}
/** Definition of one capability within a feature. */
export interface CapabilityDefinition {
    /** Fully-qualified id, e.g. "AUTH.LOGIN". */
    readonly id: string;
    /** Short capability name, e.g. "LOGIN". */
    readonly name: string;
    /** Ordered stages an implementation must connect to be CLOSED. */
    readonly expectedChain: readonly ExecutionStage[];
    readonly constraints: readonly ConstraintDefinition[];
    /** Canonical outputs the capability produces, e.g. "JWT". */
    readonly outputs: readonly string[];
    /** Declared, explicitly-approved aliases that normalize to this capability. */
    readonly aliases: readonly string[];
}
/** A top-level feature grouping related capabilities. */
export interface FeatureDefinition {
    readonly id: string;
    readonly name: string;
    readonly capabilities: readonly CapabilityDefinition[];
}
/** The complete ontology, keyed by feature id. Extend additively, never in place. */
export declare const ONTOLOGY: readonly FeatureDefinition[];
export declare function getFeature(id: string): FeatureDefinition | undefined;
export declare function getCapability(id: string): CapabilityDefinition | undefined;
/** Resolve a declared alias to its canonical capability. Returns undefined when the
 *  alias is not explicitly defined in the ontology — never guesses. */
export declare function resolveAlias(alias: string): CapabilityDefinition | undefined;
export declare function allCapabilities(): readonly CapabilityDefinition[];
export { validateOntology, validateFeatures, type OntologyProblem } from "./validators.js";
//# sourceMappingURL=index.d.ts.map