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

export const ONTOLOGY_VERSION = "1.1.0" as const;

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
} as const;
export type ExecutionStage = (typeof ExecutionStage)[keyof typeof ExecutionStage];

/**
 * Tier of each stage (ADR-0019). Closure only requires the stages whose tier is actually
 * present in the compiled repository, so a backend-only repo can be honestly CLOSED on its
 * tier instead of permanently BROKEN. FRONTEND = browser; EDGE = the client→server hop;
 * BACKEND = server + persistence.
 */
export const ExecutionTier = {
  Frontend: "FRONTEND",
  Edge: "EDGE",
  Backend: "BACKEND",
} as const;
export type ExecutionTier = (typeof ExecutionTier)[keyof typeof ExecutionTier];

export const STAGE_TIER: Readonly<Record<ExecutionStage, ExecutionTier>> = {
  FRONTEND_ROUTE: "FRONTEND",
  COMPONENT: "FRONTEND",
  HANDLER: "FRONTEND",
  FRONTEND_STATE: "FRONTEND",
  RENDERED_UI: "FRONTEND",
  API_CALL: "EDGE",
  BACKEND_ROUTE: "BACKEND",
  CONTROLLER: "BACKEND",
  SERVICE: "BACKEND",
  REPOSITORY: "BACKEND",
  DATABASE: "BACKEND",
  RESPONSE: "BACKEND",
};

export function tierOfStage(stage: ExecutionStage): ExecutionTier {
  return STAGE_TIER[stage];
}

/** The kind of value a constraint key accepts. */
export const ConstraintType = {
  Enum: "ENUM",
  Boolean: "BOOLEAN",
  Integer: "INTEGER",
  String: "STRING",
} as const;
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

// ---------------------------------------------------------------------------
// Canonical content — AUTH is fully specified as the reference feature.
// ---------------------------------------------------------------------------

const AUTH: FeatureDefinition = {
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

// ---------------------------------------------------------------------------
// Expanded coverage (TSPEC-A016 / ADR-0018): commerce, profile, notification.
// Backend-tier chains by default; closure is tier-aware (ADR-0019), so a backend
// repo is judged on the BACKEND subchain.
// ---------------------------------------------------------------------------

const S = ExecutionStage;
const BACKEND_CHAIN: readonly ExecutionStage[] = [
  S.BackendRoute,
  S.Controller,
  S.Service,
  S.Repository,
  S.Database,
  S.Response,
];

function cap(
  id: string,
  name: string,
  aliases: readonly string[] = [],
  chain: readonly ExecutionStage[] = BACKEND_CHAIN,
): CapabilityDefinition {
  return { id, name, expectedChain: chain, constraints: [], outputs: [], aliases };
}

const PAYMENT: FeatureDefinition = {
  id: "PAYMENT",
  name: "Payment",
  capabilities: [
    cap("PAYMENT.CREATE_PAYMENT", "CREATE_PAYMENT", ["pay", "payment", "charge"]),
    cap("PAYMENT.CAPTURE", "CAPTURE", ["capture"]),
    cap("PAYMENT.REFUND", "REFUND", ["refund"]),
    cap("PAYMENT.CANCEL", "CANCEL", ["void"]),
  ],
};

const ORDER: FeatureDefinition = {
  id: "ORDER",
  name: "Order",
  capabilities: [
    cap("ORDER.CREATE", "CREATE", ["order", "orders", "place_order"]),
    cap("ORDER.UPDATE", "UPDATE", []),
    cap("ORDER.CANCEL", "CANCEL", []),
  ],
};

const CART: FeatureDefinition = {
  id: "CART",
  name: "Cart",
  capabilities: [
    cap("CART.ADD_ITEM", "ADD_ITEM", ["cart", "add_to_cart"]),
    cap("CART.REMOVE_ITEM", "REMOVE_ITEM", ["remove_from_cart"]),
    cap("CART.VIEW", "VIEW", []),
  ],
};

const CHECKOUT: FeatureDefinition = {
  id: "CHECKOUT",
  name: "Checkout",
  capabilities: [cap("CHECKOUT.START", "START", ["checkout"]), cap("CHECKOUT.COMPLETE", "COMPLETE", [])],
};

const INVENTORY: FeatureDefinition = {
  id: "INVENTORY",
  name: "Inventory",
  capabilities: [
    cap("INVENTORY.CHECK", "CHECK", ["inventory", "stock"]),
    cap("INVENTORY.RESERVE", "RESERVE", ["reserve"]),
    cap("INVENTORY.RELEASE", "RELEASE", ["release"]),
  ],
};

const PROFILE: FeatureDefinition = {
  id: "PROFILE",
  name: "Profile",
  capabilities: [cap("PROFILE.VIEW", "VIEW", ["profile", "me"]), cap("PROFILE.UPDATE", "UPDATE", [])],
};

const NOTIFICATION: FeatureDefinition = {
  id: "NOTIFICATION",
  name: "Notification",
  capabilities: [cap("NOTIFICATION.SEND", "SEND", ["notify", "notification", "notifications"])],
};

/** The complete ontology, keyed by feature id. Extend additively, never in place. */
export const ONTOLOGY: readonly FeatureDefinition[] = [
  AUTH,
  PAYMENT,
  ORDER,
  CART,
  CHECKOUT,
  INVENTORY,
  PROFILE,
  NOTIFICATION,
];

// ---------------------------------------------------------------------------
// Deterministic lookups (no inference)
// ---------------------------------------------------------------------------

const FEATURE_BY_ID = new Map(ONTOLOGY.map((f) => [f.id, f]));
const CAPABILITY_BY_ID = new Map<string, CapabilityDefinition>();
const CAPABILITY_BY_ALIAS = new Map<string, CapabilityDefinition>();

for (const feature of ONTOLOGY) {
  for (const cap of feature.capabilities) {
    CAPABILITY_BY_ID.set(cap.id, cap);
    for (const alias of cap.aliases) {
      CAPABILITY_BY_ALIAS.set(alias.toLowerCase(), cap);
    }
  }
}

export function getFeature(id: string): FeatureDefinition | undefined {
  return FEATURE_BY_ID.get(id);
}

export function getCapability(id: string): CapabilityDefinition | undefined {
  return CAPABILITY_BY_ID.get(id);
}

/** Resolve a declared alias to its canonical capability. Returns undefined when the
 *  alias is not explicitly defined in the ontology — never guesses. */
export function resolveAlias(alias: string): CapabilityDefinition | undefined {
  return CAPABILITY_BY_ALIAS.get(alias.toLowerCase());
}

export function allCapabilities(): readonly CapabilityDefinition[] {
  return [...CAPABILITY_BY_ID.values()];
}

export { validateOntology, validateFeatures, type OntologyProblem } from "./validators.js";
