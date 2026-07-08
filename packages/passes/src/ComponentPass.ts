import { AbstractPass } from "./base.js";
import type { CompilationContext, IRDraft } from "@rir/core";
import type { NodeKind } from "@rir/ir";
import { makeId } from "@rir/common";

const STATE_HOOKS = new Set(["usestate", "usereducer", "usestore", "useselector", "useatom"]);
const ROUTER_FNS = new Set([
  "createbrowserrouter",
  "createrouter",
  "useroutes",
  "createroutesfromelements",
  "createhashrouter",
]);

/**
 * ComponentPass — frontend lift (ADR-0019, frontend DAG).
 *
 * Heuristically produces the frontend execution-tier nodes from .tsx/.jsx parse results
 * (COMPONENT, RENDERED_UI, HANDLER, FRONTEND_STATE, API_CALL, FRONTEND_ROUTE) and links
 * them, plus a cross-tier edge from each API_CALL to the backend ROUTE nodes, so a
 * full-stack capability can close across the frontend, edge and backend tiers.
 */
export class ComponentPass extends AbstractPass {
  readonly name = "ComponentPass";

  run(ctx: CompilationContext, draft: IRDraft): void {
    const AST = (path: string) => [{ source: "AST" as const, locator: path, confidence: 1 }];
    const mk = (id: string, kind: NodeKind, name: string, path: string, lang: string | null) =>
      draft.addNode({
        id,
        kind,
        name,
        language: lang,
        artifactId: makeId("art", path),
        span: null,
        hash: "0",
        filePath: path,
        execution: { reachable: false, entryDistance: null, runtimeObserved: false, tested: false },
        evidence: AST(path),
      });
    const edge = (kind: "CALLS" | "RENDERS", from: string, to: string, path: string) =>
      draft.addEdge({ id: makeId("edge", kind, from, to), kind, from, to, evidence: AST(path) });

    // Phase 1 — components (+ their rendered UI and an event handler) from PascalCase symbols.
    for (const pr of ctx.parseResults ?? []) {
      if (!pr.artifact.path.endsWith(".tsx") && !pr.artifact.path.endsWith(".jsx")) continue;
      for (const sym of pr.symbols) {
        if ((sym.kind !== "function" && sym.kind !== "class") || !sym.name) continue;
        if (!/^[A-Z]/.test(sym.name)) continue;
        const componentId = makeId("component", sym.name);
        mk(componentId, "COMPONENT", sym.name, pr.artifact.path, pr.artifact.language);

        const uiId = makeId("ui", sym.name);
        mk(uiId, "RENDERED_UI", `<${sym.name} />`, pr.artifact.path, pr.artifact.language);
        edge("RENDERS", componentId, uiId, pr.artifact.path);

        const handlerId = makeId("handler", sym.name);
        mk(handlerId, "HANDLER", `${sym.name} handler`, pr.artifact.path, pr.artifact.language);
        edge("CALLS", componentId, handlerId, pr.artifact.path);
      }
    }

    // Phase 2 — state, api calls and routers from frontend call facts.
    const routeIds = draft
      .getNodes()
      .filter((n) => n.kind === "ROUTE")
      .map((n) => n.id);
    for (const pr of ctx.parseResults ?? []) {
      if (!pr.artifact.path.endsWith(".tsx") && !pr.artifact.path.endsWith(".jsx")) continue;
      for (const call of pr.calls) {
        const method = call.callee.split(".").pop()?.toLowerCase() ?? "";
        const fromComponent = call.enclosing ? makeId("component", call.enclosing) : undefined;
        const line = String(call.span.startLine);

        if (STATE_HOOKS.has(method)) {
          const stateId = makeId("state", pr.artifact.path, line);
          mk(stateId, "FRONTEND_STATE", method, pr.artifact.path, pr.artifact.language);
          if (fromComponent && draft.getNode(fromComponent))
            edge("CALLS", fromComponent, stateId, pr.artifact.path);
        } else if (method === "fetch" || call.callee.includes("axios") || call.callee.includes("http")) {
          const apiId = makeId("apicall", pr.artifact.path, line);
          mk(apiId, "API_CALL", call.callee, pr.artifact.path, pr.artifact.language);
          if (fromComponent && draft.getNode(fromComponent))
            edge("CALLS", fromComponent, apiId, pr.artifact.path);
          for (const routeId of routeIds) edge("CALLS", apiId, routeId, pr.artifact.path); // cross-tier
        } else if (ROUTER_FNS.has(method)) {
          const frId = makeId("frontendroute", pr.artifact.path, line);
          mk(frId, "FRONTEND_ROUTE", method, pr.artifact.path, pr.artifact.language);
          // Link to all COMPONENT nodes from any frontend parse result — a router
          // file imports and renders page components from sibling files. We check
          // the draft because Phase 1 already ran and created COMPONENT nodes.
          for (const n of draft.getNodes()) {
            if (n.kind === "COMPONENT") {
              edge("RENDERS", frId, n.id, pr.artifact.path);
            }
          }
        }
      }
    }
  }
}
