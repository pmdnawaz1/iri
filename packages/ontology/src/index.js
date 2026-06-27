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
export const ONTOLOGY_VERSION = "1.0.0";
/**
 * Canonical execution stages. A capability's `expectedChain` is an ordered list of
 * these stages; the Closure engine maps Repository IR node kinds onto stages to
 * decide whether the path is CLOSED. Stages are ontology-owned, not IR-owned.
 */
export const ExecutionStage = {
    FrontendRoute: "FRONTEND_ROUTE",
    Component: "COMPONENT",
    Handler: "HANDLER",
    ApiCall: "API_CALL",
    BackendRoute: "BACKEND_ROUTE",
    Controller: "CONTROLLER",
    Service: "SERVICE",
    Repository: "REPOSITORY",
    Database: "DATABASE",
    Response: "RESPONSE",
    FrontendState: "FRONTEND_STATE",
    RenderedUi: "RENDERED_UI",
};
/** The kind of value a constraint key accepts. */
export const ConstraintType = {
    Enum: "ENUM",
    Boolean: "BOOLEAN",
    Integer: "INTEGER",
    String: "STRING",
};
// ---------------------------------------------------------------------------
// Canonical content — AUTH is fully specified as the reference feature.
// ---------------------------------------------------------------------------
const AUTH = {
    id: "AUTH",
    name: "Authentication",
    capabilities: [
        {
            id: "AUTH.LOGIN",
            name: "LOGIN",
            expectedChain: [
                ExecutionStage.FrontendRoute,
                ExecutionStage.Component,
                ExecutionStage.Handler,
                ExecutionStage.ApiCall,
                ExecutionStage.BackendRoute,
                ExecutionStage.Controller,
                ExecutionStage.Service,
                ExecutionStage.Repository,
                ExecutionStage.Database,
                ExecutionStage.Response,
                ExecutionStage.FrontendState,
                ExecutionStage.RenderedUi,
            ],
            constraints: [
                {
                    key: "LOGIN_IDENTIFIER",
                    type: ConstraintType.Enum,
                    enumValues: ["EMAIL", "USERNAME", "PHONE"],
                    required: true,
                },
                { key: "OTP_REQUIRED", type: ConstraintType.Boolean, enumValues: [], required: false },
                { key: "OTP_CHANNEL", type: ConstraintType.Enum, enumValues: ["EMAIL", "SMS"], required: false },
                { key: "OTP_EXPIRY", type: ConstraintType.Integer, enumValues: [], required: false },
            ],
            outputs: ["JWT"],
            aliases: ["signin", "sign_in", "log_in"],
        },
        {
            id: "AUTH.REGISTER",
            name: "REGISTER",
            expectedChain: [
                ExecutionStage.FrontendRoute,
                ExecutionStage.Component,
                ExecutionStage.Handler,
                ExecutionStage.ApiCall,
                ExecutionStage.BackendRoute,
                ExecutionStage.Controller,
                ExecutionStage.Service,
                ExecutionStage.Repository,
                ExecutionStage.Database,
                ExecutionStage.Response,
            ],
            constraints: [
                {
                    key: "LOGIN_IDENTIFIER",
                    type: ConstraintType.Enum,
                    enumValues: ["EMAIL", "USERNAME", "PHONE"],
                    required: true,
                },
            ],
            outputs: [],
            aliases: ["signup", "sign_up"],
        },
        {
            id: "AUTH.LOGOUT",
            name: "LOGOUT",
            expectedChain: [
                ExecutionStage.FrontendRoute,
                ExecutionStage.Handler,
                ExecutionStage.ApiCall,
                ExecutionStage.BackendRoute,
                ExecutionStage.Controller,
                ExecutionStage.Service,
                ExecutionStage.Response,
                ExecutionStage.FrontendState,
            ],
            constraints: [],
            outputs: [],
            aliases: ["signout", "sign_out"],
        },
        {
            id: "AUTH.VERIFY_EMAIL",
            name: "VERIFY_EMAIL",
            expectedChain: [
                ExecutionStage.BackendRoute,
                ExecutionStage.Controller,
                ExecutionStage.Service,
                ExecutionStage.Repository,
                ExecutionStage.Database,
                ExecutionStage.Response,
            ],
            constraints: [],
            outputs: [],
            aliases: [],
        },
        {
            id: "AUTH.VERIFY_OTP",
            name: "VERIFY_OTP",
            expectedChain: [
                ExecutionStage.BackendRoute,
                ExecutionStage.Controller,
                ExecutionStage.Service,
                ExecutionStage.Repository,
                ExecutionStage.Database,
                ExecutionStage.Response,
            ],
            constraints: [
                { key: "OTP_CHANNEL", type: ConstraintType.Enum, enumValues: ["EMAIL", "SMS"], required: false },
                { key: "OTP_EXPIRY", type: ConstraintType.Integer, enumValues: [], required: false },
            ],
            outputs: [],
            aliases: [],
        },
        {
            id: "AUTH.RESET_PASSWORD",
            name: "RESET_PASSWORD",
            expectedChain: [
                ExecutionStage.FrontendRoute,
                ExecutionStage.Component,
                ExecutionStage.Handler,
                ExecutionStage.ApiCall,
                ExecutionStage.BackendRoute,
                ExecutionStage.Controller,
                ExecutionStage.Service,
                ExecutionStage.Repository,
                ExecutionStage.Database,
                ExecutionStage.Response,
            ],
            constraints: [],
            outputs: [],
            aliases: ["forgot_password"],
        },
        {
            id: "AUTH.REFRESH_TOKEN",
            name: "REFRESH_TOKEN",
            expectedChain: [
                ExecutionStage.ApiCall,
                ExecutionStage.BackendRoute,
                ExecutionStage.Controller,
                ExecutionStage.Service,
                ExecutionStage.Response,
            ],
            constraints: [],
            outputs: ["JWT"],
            aliases: ["refresh"],
        },
    ],
};
/** The complete ontology, keyed by feature id. Extend additively, never in place. */
export const ONTOLOGY = [AUTH];
// ---------------------------------------------------------------------------
// Deterministic lookups (no inference)
// ---------------------------------------------------------------------------
const FEATURE_BY_ID = new Map(ONTOLOGY.map((f) => [f.id, f]));
const CAPABILITY_BY_ID = new Map();
const CAPABILITY_BY_ALIAS = new Map();
for (const feature of ONTOLOGY) {
    for (const cap of feature.capabilities) {
        CAPABILITY_BY_ID.set(cap.id, cap);
        for (const alias of cap.aliases) {
            CAPABILITY_BY_ALIAS.set(alias.toLowerCase(), cap);
        }
    }
}
export function getFeature(id) {
    return FEATURE_BY_ID.get(id);
}
export function getCapability(id) {
    return CAPABILITY_BY_ID.get(id);
}
/** Resolve a declared alias to its canonical capability. Returns undefined when the
 *  alias is not explicitly defined in the ontology — never guesses. */
export function resolveAlias(alias) {
    return CAPABILITY_BY_ALIAS.get(alias.toLowerCase());
}
export function allCapabilities() {
    return [...CAPABILITY_BY_ID.values()];
}
export { validateOntology, validateFeatures } from "./validators.js";
//# sourceMappingURL=index.js.map