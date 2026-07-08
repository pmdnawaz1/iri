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

export const ONTOLOGY_VERSION = "1.5.0" as const;

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
  Worker: "WORKER",
  Entrypoint: "ENTRYPOINT",
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
  WORKER: "BACKEND",
  ENTRYPOINT: "BACKEND",
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
  /**
   * Stages that are acceptable to skip in the expected chain (G2 / GAPS-FULL).
   * Frameworks like FastAPI route directly from CONTROLLER to DATABASE without
   * separate SERVICE/REPOSITORY layers. When a stage is in `optionalStages`,
   * its absence does not prevent a CLOSED state. Stages still present in the
   * chain but marked optional are treated as "nice to have" — the chain can
   * close without them.
   */
  readonly optionalStages?: readonly ExecutionStage[];
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
      optionalStages: [ExecutionStage.Service, ExecutionStage.Repository],
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
      optionalStages: [ExecutionStage.Service, ExecutionStage.Repository],
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
      optionalStages: [ExecutionStage.Service],
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
      optionalStages: [ExecutionStage.Service, ExecutionStage.Repository],
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
      optionalStages: [ExecutionStage.Service, ExecutionStage.Repository],
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
      optionalStages: [ExecutionStage.Service, ExecutionStage.Repository],
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
      optionalStages: [ExecutionStage.Service],
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

/**
 * Standard optional stages for backend capabilities (G2 / GAPS-FULL).
 * FastAPI and similar frameworks route directly from handler (CONTROLLER) to
 * DATABASE without separate SERVICE/REPOSITORY layers. When these stages are
 * marked optional, their absence does not prevent a CLOSED state.
 */
const BACKEND_OPTIONAL: readonly ExecutionStage[] = [S.Service, S.Repository];

function cap(
  id: string,
  name: string,
  aliases: readonly string[] = [],
  chain: readonly ExecutionStage[] = BACKEND_CHAIN,
  optionalStages?: readonly ExecutionStage[],
): CapabilityDefinition {
  return { id, name, expectedChain: chain, optionalStages, constraints: [], outputs: [], aliases };
}

const PAYMENT: FeatureDefinition = {
  id: "PAYMENT",
  name: "Payment",
  capabilities: [
    cap("PAYMENT.CREATE_PAYMENT", "CREATE_PAYMENT", ["pay", "payment", "charge"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("PAYMENT.CAPTURE", "CAPTURE", ["capture"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("PAYMENT.REFUND", "REFUND", ["refund"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("PAYMENT.CANCEL", "CANCEL", ["void"], BACKEND_CHAIN, BACKEND_OPTIONAL),
  ],
};

const ORDER: FeatureDefinition = {
  id: "ORDER",
  name: "Order",
  capabilities: [
    cap("ORDER.CREATE", "CREATE", ["order", "orders", "place_order"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("ORDER.UPDATE", "UPDATE", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("ORDER.CANCEL", "CANCEL", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
  ],
};

const CART: FeatureDefinition = {
  id: "CART",
  name: "Cart",
  capabilities: [
    cap("CART.ADD_ITEM", "ADD_ITEM", ["cart", "add_to_cart"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("CART.REMOVE_ITEM", "REMOVE_ITEM", ["remove_from_cart"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("CART.VIEW", "VIEW", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
  ],
};

const CHECKOUT: FeatureDefinition = {
  id: "CHECKOUT",
  name: "Checkout",
  capabilities: [
    cap("CHECKOUT.START", "START", ["checkout"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("CHECKOUT.COMPLETE", "COMPLETE", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
  ],
};

const INVENTORY: FeatureDefinition = {
  id: "INVENTORY",
  name: "Inventory",
  capabilities: [
    cap("INVENTORY.CHECK", "CHECK", ["inventory", "stock"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("INVENTORY.RESERVE", "RESERVE", ["reserve"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("INVENTORY.RELEASE", "RELEASE", ["release"], BACKEND_CHAIN, BACKEND_OPTIONAL),
  ],
};

const PROFILE: FeatureDefinition = {
  id: "PROFILE",
  name: "Profile",
  capabilities: [
    cap("PROFILE.VIEW", "VIEW", ["profile", "me"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("PROFILE.UPDATE", "UPDATE", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
  ],
};

const NOTIFICATION: FeatureDefinition = {
  id: "NOTIFICATION",
  name: "Notification",
  capabilities: [
    cap("NOTIFICATION.SEND", "SEND", ["notify", "notification", "notifications"], BACKEND_CHAIN, BACKEND_OPTIONAL),
  ],
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
    cap("WEBHOOK.CREATE", "CREATE", ["webhook", "webhooks"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("WEBHOOK.LIST", "LIST", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("WEBHOOK.GET", "GET", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("WEBHOOK.UPDATE", "UPDATE", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("WEBHOOK.DELETE", "DELETE", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("WEBHOOK.TRIGGER", "TRIGGER", ["trigger", "broadcast"], BACKEND_CHAIN, BACKEND_OPTIONAL),
  ],
};

const TEAM: FeatureDefinition = {
  id: "TEAM",
  name: "Team",
  capabilities: [
    cap("TEAM.CREATE", "CREATE", ["team", "teams"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("TEAM.UPDATE", "UPDATE", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("TEAM.DELETE", "DELETE", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("TEAM.LIST", "LIST", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("TEAM.INVITE_MEMBER", "INVITE_MEMBER", ["invite", "invites"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("TEAM.REMOVE_MEMBER", "REMOVE_MEMBER", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("TEAM.LIST_MEMBERS", "LIST_MEMBERS", ["members"], BACKEND_CHAIN, BACKEND_OPTIONAL),
  ],
};

const API_KEY: FeatureDefinition = {
  id: "API_KEY",
  name: "ApiKey",
  capabilities: [
    cap("API_KEY.CREATE", "CREATE", ["api_key", "apikey", "api_keys"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("API_KEY.LIST", "LIST", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("API_KEY.REVOKE", "REVOKE", ["revoke"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("API_KEY.ROTATE", "ROTATE", ["rotate"], BACKEND_CHAIN, BACKEND_OPTIONAL),
  ],
};

const FILE: FeatureDefinition = {
  id: "FILE",
  name: "File",
  capabilities: [
    cap("FILE.UPLOAD", "UPLOAD", ["upload", "uploads", "files", "file"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("FILE.DOWNLOAD", "DOWNLOAD", ["download"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("FILE.DELETE", "DELETE", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("FILE.LIST", "LIST", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("FILE.GET_URL", "GET_URL", ["presigned"], BACKEND_CHAIN, BACKEND_OPTIONAL),
  ],
};

const SEARCH: FeatureDefinition = {
  id: "SEARCH",
  name: "Search",
  capabilities: [cap("SEARCH.QUERY", "QUERY", ["search", "query", "find"], BACKEND_CHAIN, BACKEND_OPTIONAL)],
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
    cap("SCHEDULE.CREATE", "CREATE", ["schedule", "booking"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("SCHEDULE.CANCEL", "CANCEL", ["cancel_booking"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("SCHEDULE.RESCHEDULE", "RESCHEDULE", ["reschedule"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("SCHEDULE.GET_AVAILABILITY", "GET_AVAILABILITY", ["slots", "availability"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("SCHEDULE.LIST", "LIST", ["schedules", "bookings"], BACKEND_CHAIN, BACKEND_OPTIONAL),
  ],
};

const WORKFLOW: FeatureDefinition = {
  id: "WORKFLOW",
  name: "Workflow",
  capabilities: [
    cap("WORKFLOW.CREATE", "CREATE", ["workflow", "workflows", "automation"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("WORKFLOW.UPDATE", "UPDATE", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("WORKFLOW.DELETE", "DELETE", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("WORKFLOW.TRIGGER", "TRIGGER", ["execute"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("WORKFLOW.PAUSE", "PAUSE", ["pause"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("WORKFLOW.LIST", "LIST", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("WORKFLOW.GET_RUNS", "GET_RUNS", ["runs", "executions"], BACKEND_CHAIN, BACKEND_OPTIONAL),
  ],
};

const SUBSCRIPTION: FeatureDefinition = {
  id: "SUBSCRIPTION",
  name: "Subscription",
  capabilities: [
    cap("SUBSCRIPTION.CREATE", "CREATE", ["subscribe", "subscription", "subscriptions"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("SUBSCRIPTION.CANCEL", "CANCEL", ["unsubscribe"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("SUBSCRIPTION.UPDATE", "UPDATE", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("SUBSCRIPTION.LIST", "LIST", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("SUBSCRIPTION.GET", "GET", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
  ],
};

const OAUTH: FeatureDefinition = {
  id: "OAUTH",
  name: "OAuth",
  capabilities: [
    cap("OAUTH.AUTHORIZE", "AUTHORIZE", ["oauth", "authorize"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("OAUTH.EXCHANGE_TOKEN", "EXCHANGE_TOKEN", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("OAUTH.REFRESH", "REFRESH", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
  ],
};

const INTEGRATION: FeatureDefinition = {
  id: "INTEGRATION",
  name: "Integration",
  capabilities: [
    cap("INTEGRATION.CREATE", "CREATE", ["integration", "integrations"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("INTEGRATION.LIST", "LIST", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("INTEGRATION.DELETE", "DELETE", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
  ],
};

const PRODUCT: FeatureDefinition = {
  id: "PRODUCT",
  name: "Product",
  capabilities: [
    cap("PRODUCT.CREATE", "CREATE", ["product", "products"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("PRODUCT.UPDATE", "UPDATE", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("PRODUCT.DELETE", "DELETE", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("PRODUCT.LIST", "LIST", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("PRODUCT.GET", "GET", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("PRODUCT.CREATE_VARIANT", "CREATE_VARIANT", ["variant", "variants"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("PRODUCT.CREATE_CATEGORY", "CREATE_CATEGORY", ["category", "categories"], BACKEND_CHAIN, BACKEND_OPTIONAL),
  ],
};

const DISCOUNT: FeatureDefinition = {
  id: "DISCOUNT",
  name: "Discount",
  capabilities: [
    cap("DISCOUNT.CREATE", "CREATE", ["discount", "promotion", "promotions", "promo"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("DISCOUNT.UPDATE", "UPDATE", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("DISCOUNT.DELETE", "DELETE", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("DISCOUNT.LIST", "LIST", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("DISCOUNT.APPLY", "APPLY", ["redeem"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("DISCOUNT.CREATE_CAMPAIGN", "CREATE_CAMPAIGN", ["campaign", "campaigns"], BACKEND_CHAIN, BACKEND_OPTIONAL),
  ],
};

const SHIPPING: FeatureDefinition = {
  id: "SHIPPING",
  name: "Shipping",
  capabilities: [
    cap("SHIPPING.CREATE_OPTION", "CREATE_OPTION", ["shipping"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("SHIPPING.GET_RATES", "GET_RATES", ["rates"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("SHIPPING.FULFILL", "FULFILL", ["fulfill", "fulfillment", "fulfillments"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("SHIPPING.RETURN", "RETURN", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("SHIPPING.EXCHANGE", "EXCHANGE", ["exchange", "exchanges"], BACKEND_CHAIN, BACKEND_OPTIONAL),
  ],
};

const CALENDAR: FeatureDefinition = {
  id: "CALENDAR",
  name: "Calendar",
  capabilities: [
    cap("CALENDAR.CONNECT", "CONNECT", ["calendar", "calendars"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("CALENDAR.GET_BUSY_TIMES", "GET_BUSY_TIMES", ["busy_times", "freebusy"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("CALENDAR.LIST_CONNECTIONS", "LIST_CONNECTIONS", ["connections"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("CALENDAR.SYNC", "SYNC", ["ics_feed"], BACKEND_CHAIN, BACKEND_OPTIONAL),
  ],
};

/** The complete ontology, keyed by feature id. Extend additively, never in place. */
// ---------------------------------------------------------------------------
// Platform / dev-tooling domains (1.4.0). Grounded in a real consumer
// (project-os / CodeOrch: FastAPI backend — auth, orgs, billing, projects,
// GitHub connect, tasks, comments, realtime, logs). Adds the features whose
// routes were previously UNMAPPED. Aliases are domain-specific and unique.
// ---------------------------------------------------------------------------

const PROJECT: FeatureDefinition = {
  id: "PROJECT",
  name: "Project",
  capabilities: [
    cap("PROJECT.CREATE", "CREATE", ["project", "projects"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("PROJECT.UPDATE", "UPDATE", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("PROJECT.DELETE", "DELETE", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("PROJECT.LIST", "LIST", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("PROJECT.GET", "GET", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("PROJECT.GET_SETTINGS", "GET_SETTINGS", ["settings"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("PROJECT.GET_SUMMARY", "GET_SUMMARY", ["summary"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("PROJECT.SYNC", "SYNC", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
  ],
};

const VCS: FeatureDefinition = {
  id: "VCS",
  name: "Vcs",
  capabilities: [
    cap("VCS.CONNECT", "CONNECT", ["vcs", "git_connect"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("VCS.DISCONNECT", "DISCONNECT", ["disconnect"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("VCS.LIST_REPOS", "LIST_REPOS", ["repo", "repos", "repository", "repositories"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("VCS.LIST_BRANCHES", "LIST_BRANCHES", ["branch", "branches"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("VCS.LIST_PULLS", "LIST_PULLS", ["pull", "pulls", "pr", "pull_request"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("VCS.MERGE_PULL", "MERGE_PULL", ["merge_pull"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("VCS.LIST_ISSUES", "LIST_ISSUES", ["issue", "issues"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("VCS.SETUP_WEBHOOK", "SETUP_WEBHOOK", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("VCS.SYNC", "SYNC", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
  ],
};

const TASK: FeatureDefinition = {
  id: "TASK",
  name: "Task",
  capabilities: [
    cap("TASK.CREATE", "CREATE", ["task", "tasks"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("TASK.UPDATE", "UPDATE", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("TASK.DELETE", "DELETE", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("TASK.LIST", "LIST", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("TASK.GET", "GET", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("TASK.CLAIM", "CLAIM", ["claim"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("TASK.START", "START", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("TASK.COMPLETE", "COMPLETE", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("TASK.ASSIGN", "ASSIGN", ["assign"], BACKEND_CHAIN, BACKEND_OPTIONAL),
  ],
};

const COMMENT: FeatureDefinition = {
  id: "COMMENT",
  name: "Comment",
  capabilities: [
    cap("COMMENT.CREATE", "CREATE", ["comment", "comments"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("COMMENT.LIST", "LIST", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("COMMENT.UPDATE", "UPDATE", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("COMMENT.DELETE", "DELETE", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
  ],
};

const REALTIME: FeatureDefinition = {
  id: "REALTIME",
  name: "Realtime",
  capabilities: [
    cap("REALTIME.PUBLISH", "PUBLISH", ["publish"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("REALTIME.SUBSCRIBE", "SUBSCRIBE", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("REALTIME.PRESENCE", "PRESENCE", ["presence"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("REALTIME.ACTIVITY", "ACTIVITY", ["activity", "activity_feed"], BACKEND_CHAIN, BACKEND_OPTIONAL),
  ],
};

const BILLING: FeatureDefinition = {
  id: "BILLING",
  name: "Billing",
  capabilities: [
    cap("BILLING.CHECKOUT", "CHECKOUT", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("BILLING.CREATE_INVOICE", "CREATE_INVOICE", ["invoice", "invoices"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("BILLING.LIST_INVOICES", "LIST_INVOICES", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("BILLING.GET_INVOICE", "GET_INVOICE", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("BILLING.SEND_INVOICE", "SEND_INVOICE", ["send_invoice"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("BILLING.GET_PLAN", "GET_PLAN", ["plan", "plans"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("BILLING.LIST_PLANS", "LIST_PLANS", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("BILLING.CREATE_PLAN", "CREATE_PLAN", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("BILLING.UPDATE_PLAN", "UPDATE_PLAN", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("BILLING.GET_USAGE", "GET_USAGE", ["usage"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("BILLING.TRACK_USAGE", "TRACK_USAGE", ["track_usage", "metered"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("BILLING.CANCEL", "CANCEL", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
  ],
};

const AUDIT: FeatureDefinition = {
  id: "AUDIT",
  name: "Audit",
  capabilities: [
    cap("AUDIT.RECORD", "RECORD", ["audit", "audit_log", "audit_trail"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("AUDIT.QUERY", "QUERY", ["logs"], BACKEND_CHAIN, BACKEND_OPTIONAL),
  ],
};

// ---------------------------------------------------------------------------
// G5 ontology additions (GAPS-FULL). ORG (distinct from TEAM), WEBSOCKET,
// expanded BILLING (above), and ADMIN.
// ---------------------------------------------------------------------------

const ORG: FeatureDefinition = {
  id: "ORG",
  name: "Org",
  capabilities: [
    cap("ORG.CREATE", "CREATE", ["org", "organization", "organizations"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("ORG.UPDATE", "UPDATE", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("ORG.DELETE", "DELETE", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("ORG.LIST", "LIST", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("ORG.GET", "GET", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("ORG.GET_SETTINGS", "GET_SETTINGS", ["org_settings"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("ORG.UPDATE_SETTINGS", "UPDATE_SETTINGS", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("ORG.INVITE_MEMBER", "INVITE_MEMBER", ["org_invite"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("ORG.REMOVE_MEMBER", "REMOVE_MEMBER", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("ORG.LIST_MEMBERS", "LIST_MEMBERS", ["org_members"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("ORG.UPDATE_ROLE", "UPDATE_ROLE", ["role", "roles", "org_role"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("ORG.SSO", "SSO", ["sso", "single_sign_on"], BACKEND_CHAIN, BACKEND_OPTIONAL),
  ],
};

const WEBSOCKET: FeatureDefinition = {
  id: "WEBSOCKET",
  name: "Websocket",
  capabilities: [
    cap("WEBSOCKET.CONNECT", "CONNECT", ["websocket", "ws_connect"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("WEBSOCKET.DISCONNECT", "DISCONNECT", ["ws_disconnect"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("WEBSOCKET.SEND", "SEND", ["ws_send"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("WEBSOCKET.BROADCAST", "BROADCAST", ["ws_broadcast"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("WEBSOCKET.JOIN_ROOM", "JOIN_ROOM", ["join_room", "rooms"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("WEBSOCKET.LEAVE_ROOM", "LEAVE_ROOM", ["leave_room"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("WEBSOCKET.SUBSCRIBE_CHANNEL", "SUBSCRIBE_CHANNEL", ["subscribe_channel", "channel"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("WEBSOCKET.PUBLISH_CHANNEL", "PUBLISH_CHANNEL", ["publish_channel"], BACKEND_CHAIN, BACKEND_OPTIONAL),
  ],
};

const ADMIN: FeatureDefinition = {
  id: "ADMIN",
  name: "Admin",
  capabilities: [
    cap("ADMIN.LIST_USERS", "LIST_USERS", ["admin_users", "manage_users"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("ADMIN.GET_USER", "GET_USER", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("ADMIN.UPDATE_USER", "UPDATE_USER", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("ADMIN.DELETE_USER", "DELETE_USER", ["ban_user", "deactivate_user"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("ADMIN.IMPERSONATE", "IMPERSONATE", ["impersonate", "login_as"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("ADMIN.GET_SYSTEM_CONFIG", "GET_SYSTEM_CONFIG", ["system_config", "admin_config"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("ADMIN.UPDATE_SYSTEM_CONFIG", "UPDATE_SYSTEM_CONFIG", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("ADMIN.LIST_FEATURE_FLAGS", "LIST_FEATURE_FLAGS", ["feature_flags", "feature_toggles"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("ADMIN.UPDATE_FEATURE_FLAG", "UPDATE_FEATURE_FLAG", [], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("ADMIN.GET_METRICS", "GET_METRICS", ["metrics", "admin_metrics"], BACKEND_CHAIN, BACKEND_OPTIONAL),
    cap("ADMIN.EXPORT_DATA", "EXPORT_DATA", ["export", "data_export"], BACKEND_CHAIN, BACKEND_OPTIONAL),
  ],
};

// ---------------------------------------------------------------------------
// MCP / CLI tool entrypoints (G4 — Go MCP binaries, CLI tools).
// These use ENTRYPOINT → HANDLER → SERVICE → DATABASE (no HTTP ROUTE layer).
// ---------------------------------------------------------------------------

const MCP_CHAIN: readonly ExecutionStage[] = [
  ExecutionStage.Entrypoint,
  ExecutionStage.Handler,
  ExecutionStage.Service,
  ExecutionStage.Database,
  ExecutionStage.Response,
];
const MCP_OPTIONAL: readonly ExecutionStage[] = [ExecutionStage.Service, ExecutionStage.Repository];

const MCP: FeatureDefinition = {
  id: "MCP",
  name: "MCP Tool",
  capabilities: [
    cap("MCP.TOOL", "TOOL", ["mcp_tool", "mcp_tool_call"], MCP_CHAIN, MCP_OPTIONAL),
    cap("MCP.LIST_TOOLS", "LIST_TOOLS", ["list_tools", "tools_list"], MCP_CHAIN, MCP_OPTIONAL),
    cap("MCP.CALL_TOOL", "CALL_TOOL", ["call_tool", "tool_call"], MCP_CHAIN, MCP_OPTIONAL),
    cap("MCP.RESOURCE", "RESOURCE", ["mcp_resource", "read_resource"], MCP_CHAIN, MCP_OPTIONAL),
    cap("MCP.PROMPT", "PROMPT", ["mcp_prompt", "get_prompt"], MCP_CHAIN, MCP_OPTIONAL),
  ],
};

// ---------------------------------------------------------------------------
// WORKER — async/background job entrypoints (arq, Sidekiq, Redis queues, cron).
// Chain: WORKER → HANDLER → SERVICE → DATABASE (or NOTIFICATION).
// ---------------------------------------------------------------------------

const WORKER_CHAIN: readonly ExecutionStage[] = [
  ExecutionStage.Worker,
  ExecutionStage.Handler,
  ExecutionStage.Service,
  ExecutionStage.Database,
  ExecutionStage.Response,
];
const WORKER_OPTIONAL: readonly ExecutionStage[] = [ExecutionStage.Service, ExecutionStage.Repository];

const WORKER: FeatureDefinition = {
  id: "WORKER",
  name: "Worker",
  capabilities: [
    cap("WORKER.JOB", "JOB", ["worker_job", "task_job", "background_job"], WORKER_CHAIN, WORKER_OPTIONAL),
    cap("WORKER.ENQUEUE", "ENQUEUE", ["enqueue", "dispatch_job", "queue_task"], WORKER_CHAIN, WORKER_OPTIONAL),
    cap("WORKER.SCHEDULE", "SCHEDULE", ["cron_job", "scheduled_task", "periodic_job"], WORKER_CHAIN, WORKER_OPTIONAL),
    cap("WORKER.CONSUME", "CONSUME", ["consume_queue", "listen_queue", "queue_listener"], WORKER_CHAIN, WORKER_OPTIONAL),
  ],
};

// ---------------------------------------------------------------------------
// DOCUMENT — structured design docs, ADRs, runbooks (1.5.0).
// Distinct from FILE (raw blob storage): documents have title, content, doc_type,
// tags, and branch. Uses the standard backend chain.
// ---------------------------------------------------------------------------

const DOCUMENT_CHAIN: readonly ExecutionStage[] = [
  ExecutionStage.BackendRoute,
  ExecutionStage.Controller,
  ExecutionStage.Service,
  ExecutionStage.Repository,
  ExecutionStage.Database,
  ExecutionStage.Response,
];
const DOCUMENT_OPTIONAL: readonly ExecutionStage[] = [ExecutionStage.Service, ExecutionStage.Repository];

const DOCUMENT: FeatureDefinition = {
  id: "DOCUMENT",
  name: "Document",
  capabilities: [
    cap("DOCUMENT.CREATE", "CREATE", ["doc", "docs", "document", "documents"], DOCUMENT_CHAIN, DOCUMENT_OPTIONAL),
    cap("DOCUMENT.UPDATE", "UPDATE", [], DOCUMENT_CHAIN, DOCUMENT_OPTIONAL),
    cap("DOCUMENT.LIST", "LIST", [], DOCUMENT_CHAIN, DOCUMENT_OPTIONAL),
    cap("DOCUMENT.GET", "GET", [], DOCUMENT_CHAIN, DOCUMENT_OPTIONAL),
    cap("DOCUMENT.DELETE", "DELETE", [], DOCUMENT_CHAIN, DOCUMENT_OPTIONAL),
  ],
};

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
  PROJECT,
  VCS,
  TASK,
  COMMENT,
  REALTIME,
  BILLING,
  AUDIT,
  ORG,
  WEBSOCKET,
  ADMIN,
  MCP,
  WORKER,
  DOCUMENT,
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
  BILLING: "CRITICAL",
  VCS: "HIGH",
  PROJECT: "HIGH",
  TASK: "NORMAL",
  AUDIT: "HIGH",
  REALTIME: "NORMAL",
  ORG: "HIGH",
  WEBSOCKET: "NORMAL",
  ADMIN: "CRITICAL",
  MCP: "HIGH",
  WORKER: "HIGH",
  DOCUMENT: "NORMAL",
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
