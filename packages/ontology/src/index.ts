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

export const ONTOLOGY_VERSION = "1.4.0" as const;

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

// ---------------------------------------------------------------------------
// Self-evolution graduation #1 (ADR-0021). Five features accepted from the
// ontology-candidates review queue — each evidenced across 2+ independent repos
// via route patterns the adapter reliably detects. Discovery-sensitive candidates
// (SCHEDULE/WORKFLOW/SUBSCRIPTION/OAUTH) are held until the adapter route-detection
// gaps (TSPEC-A021) are closed and the corpus re-compiled.
// ---------------------------------------------------------------------------

const WEBHOOK: FeatureDefinition = {
  id: "WEBHOOK",
  name: "Webhook",
  capabilities: [
    cap("WEBHOOK.CREATE", "CREATE", ["webhook", "webhooks"]),
    cap("WEBHOOK.LIST", "LIST", []),
    cap("WEBHOOK.GET", "GET", []),
    cap("WEBHOOK.UPDATE", "UPDATE", []),
    cap("WEBHOOK.DELETE", "DELETE", []),
    cap("WEBHOOK.TRIGGER", "TRIGGER", ["trigger", "broadcast"]),
  ],
};

const TEAM: FeatureDefinition = {
  id: "TEAM",
  name: "Team",
  capabilities: [
    cap("TEAM.CREATE", "CREATE", ["team", "teams", "organization", "organizations"]),
    cap("TEAM.UPDATE", "UPDATE", []),
    cap("TEAM.DELETE", "DELETE", []),
    cap("TEAM.LIST", "LIST", []),
    cap("TEAM.INVITE_MEMBER", "INVITE_MEMBER", ["invite", "invites"]),
    cap("TEAM.REMOVE_MEMBER", "REMOVE_MEMBER", []),
    cap("TEAM.LIST_MEMBERS", "LIST_MEMBERS", ["members"]),
  ],
};

const API_KEY: FeatureDefinition = {
  id: "API_KEY",
  name: "ApiKey",
  capabilities: [
    cap("API_KEY.CREATE", "CREATE", ["api_key", "apikey", "api_keys"]),
    cap("API_KEY.LIST", "LIST", []),
    cap("API_KEY.REVOKE", "REVOKE", ["revoke"]),
    cap("API_KEY.ROTATE", "ROTATE", ["rotate"]),
  ],
};

const FILE: FeatureDefinition = {
  id: "FILE",
  name: "File",
  capabilities: [
    cap("FILE.UPLOAD", "UPLOAD", ["upload", "uploads", "files", "file"]),
    cap("FILE.DOWNLOAD", "DOWNLOAD", ["download"]),
    cap("FILE.DELETE", "DELETE", []),
    cap("FILE.LIST", "LIST", []),
    cap("FILE.GET_URL", "GET_URL", ["presigned"]),
  ],
};

const SEARCH: FeatureDefinition = {
  id: "SEARCH",
  name: "Search",
  capabilities: [cap("SEARCH.QUERY", "QUERY", ["search", "query", "find"])],
};

// ---------------------------------------------------------------------------
// Self-evolution graduation #2 (ADR-0023). The held discovery-sensitive + single-repo
// candidates, accepted by architect directive with cleanups: OAUTH split from INTEGRATION;
// SUBSCRIPTION trimmed of booking evidence; CONFERENCING dropped (niche); and aliases
// de-collided (an alias is globally unique, so e.g. `trigger`/`reserve`/`exchange`/`connect`/
// `availability` stay with their first owner). PRODUCT/DISCOUNT/SHIPPING/CALENDAR rest on a
// single strong repo — backfill a 2nd repo's evidence once TSPEC-A021 lands (see ADR-0023).
// ---------------------------------------------------------------------------

const SCHEDULE: FeatureDefinition = {
  id: "SCHEDULE",
  name: "Schedule",
  capabilities: [
    cap("SCHEDULE.CREATE", "CREATE", ["schedule", "booking"]),
    cap("SCHEDULE.CANCEL", "CANCEL", ["cancel_booking"]),
    cap("SCHEDULE.RESCHEDULE", "RESCHEDULE", ["reschedule"]),
    cap("SCHEDULE.GET_AVAILABILITY", "GET_AVAILABILITY", ["slots", "availability"]),
    cap("SCHEDULE.LIST", "LIST", ["schedules", "bookings"]),
  ],
};

const WORKFLOW: FeatureDefinition = {
  id: "WORKFLOW",
  name: "Workflow",
  capabilities: [
    cap("WORKFLOW.CREATE", "CREATE", ["workflow", "workflows", "automation"]),
    cap("WORKFLOW.UPDATE", "UPDATE", []),
    cap("WORKFLOW.DELETE", "DELETE", []),
    cap("WORKFLOW.TRIGGER", "TRIGGER", ["execute"]),
    cap("WORKFLOW.PAUSE", "PAUSE", ["pause"]),
    cap("WORKFLOW.LIST", "LIST", []),
    cap("WORKFLOW.GET_RUNS", "GET_RUNS", ["runs", "executions"]),
  ],
};

const SUBSCRIPTION: FeatureDefinition = {
  id: "SUBSCRIPTION",
  name: "Subscription",
  capabilities: [
    cap("SUBSCRIPTION.CREATE", "CREATE", ["subscribe", "subscription", "subscriptions"]),
    cap("SUBSCRIPTION.CANCEL", "CANCEL", ["unsubscribe"]),
    cap("SUBSCRIPTION.UPDATE", "UPDATE", []),
    cap("SUBSCRIPTION.LIST", "LIST", []),
    cap("SUBSCRIPTION.GET", "GET", []),
  ],
};

const OAUTH: FeatureDefinition = {
  id: "OAUTH",
  name: "OAuth",
  capabilities: [
    cap("OAUTH.AUTHORIZE", "AUTHORIZE", ["oauth", "authorize"]),
    cap("OAUTH.EXCHANGE_TOKEN", "EXCHANGE_TOKEN", []),
    cap("OAUTH.REFRESH", "REFRESH", []),
  ],
};

const INTEGRATION: FeatureDefinition = {
  id: "INTEGRATION",
  name: "Integration",
  capabilities: [
    cap("INTEGRATION.CREATE", "CREATE", ["integration", "integrations"]),
    cap("INTEGRATION.LIST", "LIST", []),
    cap("INTEGRATION.DELETE", "DELETE", []),
  ],
};

const PRODUCT: FeatureDefinition = {
  id: "PRODUCT",
  name: "Product",
  capabilities: [
    cap("PRODUCT.CREATE", "CREATE", ["product", "products"]),
    cap("PRODUCT.UPDATE", "UPDATE", []),
    cap("PRODUCT.DELETE", "DELETE", []),
    cap("PRODUCT.LIST", "LIST", []),
    cap("PRODUCT.GET", "GET", []),
    cap("PRODUCT.CREATE_VARIANT", "CREATE_VARIANT", ["variant", "variants"]),
    cap("PRODUCT.CREATE_CATEGORY", "CREATE_CATEGORY", ["category", "categories"]),
  ],
};

const DISCOUNT: FeatureDefinition = {
  id: "DISCOUNT",
  name: "Discount",
  capabilities: [
    cap("DISCOUNT.CREATE", "CREATE", ["discount", "promotion", "promotions", "promo"]),
    cap("DISCOUNT.UPDATE", "UPDATE", []),
    cap("DISCOUNT.DELETE", "DELETE", []),
    cap("DISCOUNT.LIST", "LIST", []),
    cap("DISCOUNT.APPLY", "APPLY", ["redeem"]),
    cap("DISCOUNT.CREATE_CAMPAIGN", "CREATE_CAMPAIGN", ["campaign", "campaigns"]),
  ],
};

const SHIPPING: FeatureDefinition = {
  id: "SHIPPING",
  name: "Shipping",
  capabilities: [
    cap("SHIPPING.CREATE_OPTION", "CREATE_OPTION", ["shipping"]),
    cap("SHIPPING.GET_RATES", "GET_RATES", ["rates"]),
    cap("SHIPPING.FULFILL", "FULFILL", ["fulfill", "fulfillment", "fulfillments"]),
    cap("SHIPPING.RETURN", "RETURN", []),
    cap("SHIPPING.EXCHANGE", "EXCHANGE", ["exchange", "exchanges"]),
  ],
};

const CALENDAR: FeatureDefinition = {
  id: "CALENDAR",
  name: "Calendar",
  capabilities: [
    cap("CALENDAR.CONNECT", "CONNECT", ["calendar", "calendars"]),
    cap("CALENDAR.GET_BUSY_TIMES", "GET_BUSY_TIMES", ["busy_times", "freebusy"]),
    cap("CALENDAR.LIST_CONNECTIONS", "LIST_CONNECTIONS", ["connections"]),
    cap("CALENDAR.SYNC", "SYNC", ["ics_feed"]),
  ],
};

// ---------------------------------------------------------------------------
// Self-evolution graduation #3. The features accepted from the
// ontology-candidates review queue / expected-next: MESSAGE, COMMENT, TAG,
// REVIEW, AUDIT, FEATURE_FLAG, EXPORT, IMPORT, ANALYTICS.
// ---------------------------------------------------------------------------

const MESSAGE: FeatureDefinition = {
  id: "MESSAGE",
  name: "Message",
  capabilities: [
    cap("MESSAGE.SEND", "SEND", ["message", "chat", "dm"]),
    cap("MESSAGE.LIST", "LIST", ["messages", "chats"]),
    cap("MESSAGE.READ", "READ", ["read", "read_receipt"]),
  ],
};

const COMMENT: FeatureDefinition = {
  id: "COMMENT",
  name: "Comment",
  capabilities: [
    cap("COMMENT.CREATE", "CREATE", ["comment", "reply"]),
    cap("COMMENT.UPDATE", "UPDATE", []),
    cap("COMMENT.DELETE", "DELETE", []),
    cap("COMMENT.LIST", "LIST", ["comments"]),
  ],
};

const TAG: FeatureDefinition = {
  id: "TAG",
  name: "Tag",
  capabilities: [
    cap("TAG.CREATE", "CREATE", ["tag", "label"]),
    cap("TAG.UPDATE", "UPDATE", []),
    cap("TAG.DELETE", "DELETE", []),
    cap("TAG.LIST", "LIST", ["tags", "labels"]),
    cap("TAG.ASSIGN", "ASSIGN", ["assign_tag", "add_tag", "add_label"]),
    cap("TAG.REMOVE", "REMOVE", ["remove_tag", "remove_label"]),
  ],
};

const REVIEW: FeatureDefinition = {
  id: "REVIEW",
  name: "Review",
  capabilities: [
    cap("REVIEW.CREATE", "CREATE", ["review", "rating"]),
    cap("REVIEW.UPDATE", "UPDATE", []),
    cap("REVIEW.DELETE", "DELETE", []),
    cap("REVIEW.LIST", "LIST", ["reviews", "ratings"]),
  ],
};

const AUDIT: FeatureDefinition = {
  id: "AUDIT",
  name: "Audit",
  capabilities: [
    cap("AUDIT.RECORD", "RECORD", ["audit_log", "activity_log", "audit_trail"]),
    cap("AUDIT.QUERY", "QUERY", ["audit_logs", "activity_logs"]),
  ],
};

const FEATURE_FLAG: FeatureDefinition = {
  id: "FEATURE_FLAG",
  name: "FeatureFlag",
  capabilities: [
    cap("FEATURE_FLAG.CREATE", "CREATE", ["feature_flag", "flag"]),
    cap("FEATURE_FLAG.UPDATE", "UPDATE", []),
    cap("FEATURE_FLAG.DELETE", "DELETE", []),
    cap("FEATURE_FLAG.LIST", "LIST", ["feature_flags", "flags"]),
    cap("FEATURE_FLAG.EVALUATE", "EVALUATE", ["evaluate", "check_flag"]),
  ],
};

const EXPORT: FeatureDefinition = {
  id: "EXPORT",
  name: "Export",
  capabilities: [
    cap("EXPORT.START", "START", ["export", "download_data"]),
    cap("EXPORT.STATUS", "STATUS", ["export_status"]),
    cap("EXPORT.DOWNLOAD", "DOWNLOAD", ["download_export"]),
  ],
};

const IMPORT: FeatureDefinition = {
  id: "IMPORT",
  name: "Import",
  capabilities: [
    cap("IMPORT.START", "START", ["import", "upload_data"]),
    cap("IMPORT.STATUS", "STATUS", ["import_status"]),
  ],
};

const ANALYTICS: FeatureDefinition = {
  id: "ANALYTICS",
  name: "Analytics",
  capabilities: [
    cap("ANALYTICS.TRACK", "TRACK", ["track", "event"]),
    cap("ANALYTICS.QUERY", "QUERY", ["analytics", "report", "reporting", "stats", "metrics"]),
  ],
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
  WEBHOOK,
  TEAM,
  API_KEY,
  FILE,
  SEARCH,
  SCHEDULE,
  WORKFLOW,
  SUBSCRIPTION,
  OAUTH,
  INTEGRATION,
  PRODUCT,
  DISCOUNT,
  SHIPPING,
  CALENDAR,
  MESSAGE,
  COMMENT,
  TAG,
  REVIEW,
  AUDIT,
  FEATURE_FLAG,
  EXPORT,
  IMPORT,
  ANALYTICS,
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

// ---------------------------------------------------------------------------
// Capability metadata for the GAPS-v2 program (ADR-0024). Kept as lookup tables
// rather than fields on every cap() so the additions are non-invasive. Architect-owned.
// ---------------------------------------------------------------------------

/** Business criticality of a capability — weights findings (TSPEC-A025 / GAPS-v2 V8). */
export const Criticality = {
  Critical: "CRITICAL",
  High: "HIGH",
  Normal: "NORMAL",
  Low: "LOW",
} as const;
export type Criticality = (typeof Criticality)[keyof typeof Criticality];

const CRITICALITY_BY_FEATURE: Record<string, Criticality> = {
  AUTH: "CRITICAL",
  PAYMENT: "CRITICAL",
  API_KEY: "CRITICAL",
  OAUTH: "CRITICAL",
  ORDER: "HIGH",
  CHECKOUT: "HIGH",
  INVENTORY: "HIGH",
  TEAM: "HIGH",
  WEBHOOK: "HIGH",
  SUBSCRIPTION: "HIGH",
  DISCOUNT: "HIGH",
  SHIPPING: "HIGH",
};

/** Capability business criticality. Defaults to NORMAL when the feature is unlisted. */
export function getCriticality(capabilityId: string): Criticality {
  const feature = capabilityId.split(".")[0] ?? "";
  return CRITICALITY_BY_FEATURE[feature] ?? "NORMAL";
}

// Capabilities reachable WITHOUT a prior authenticated session (the public surface).
// Everything else is expected to sit behind an auth/authorization guard (GAPS-v2 V5).
const PUBLIC_CAPABILITIES = new Set<string>([
  "AUTH.LOGIN",
  "AUTH.REGISTER",
  "AUTH.RESET_PASSWORD",
  "AUTH.VERIFY_EMAIL",
  "AUTH.VERIFY_OTP",
  "AUTH.REFRESH_TOKEN",
  "OAUTH.AUTHORIZE",
  "OAUTH.EXCHANGE_TOKEN",
]);

/** Whether a capability must traverse an auth/authorization guard to be securely closed
 *  (TSPEC-A024 / GAPS-v2 V5 guard closure). Public auth-entry capabilities are exempt. */
export function requiresAuth(capabilityId: string): boolean {
  return !PUBLIC_CAPABILITIES.has(capabilityId);
}

export { validateOntology, validateFeatures, type OntologyProblem } from "./validators.js";
