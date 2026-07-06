/**
 * RoutePass — TSPEC-P03
 *
 * Lifts each RouteFact into a ROUTE node and a ROUTES_TO edge to the controller
 * invoked by its handler. RoutePass runs after CallPass, so controller nodes
 * already exist. Per ADR-0016.
 */

import type { CompilationContext, IRDraft } from "@rir/core";
import { makeId } from "@rir/common";
import { AbstractPass, PASS_PRIORITY } from "./base.js";

export class RoutePass extends AbstractPass {
  readonly name = "RoutePass" as const;

  override get priority(): number {
    return PASS_PRIORITY.RoutePass;
  }

  override supports(): boolean {
    return true;
  }

  override run(ctx: CompilationContext, draft: IRDraft): void {
    for (const pr of ctx.parseResults ?? []) {
      for (const route of pr.routes) {
        const routeId = makeId("route", `${route.method} ${route.path}`);

        draft.addNode({
          id: routeId,
          kind: "ROUTE",
          name: `${route.method} ${route.path}`,
          language: pr.artifact.language,
          artifactId: pr.artifact.id,
          span: route.span,
          hash: "0",
          filePath: pr.artifact.path,
          execution: {
            reachable: false,
            entryDistance: null,
            runtimeObserved: false,
            tested: false,
          },
          evidence: [
            {
              source: "AST",
              locator: pr.artifact.path,
              confidence: 1,
            },
          ],
        });

        // Response producer (ADR-0019): an Express-style handler that sends a response
        // (`res.json`/`reply.send`/…) yields a RESPONSE node. Decorator frameworks (NestJS,
        // Spring, FastAPI) auto-serialize the handler's return value, so a route bound to a
        // controller method also produces a RESPONSE — handled below once the controller links.
        const hasExplicitResponse = /\b(res|reply|response|ctx)\.(json|send|status|code|end|render)\b/.test(
          route.handler,
        );
        const emitResponse = (): void => {
          const responseId = makeId("response", routeId);
          draft.addNode({
            id: responseId,
            kind: "RESPONSE",
            name: `response ${route.method} ${route.path}`,
            language: pr.artifact.language,
            artifactId: pr.artifact.id,
            span: route.span,
            hash: "0",
            filePath: pr.artifact.path,
            execution: { reachable: false, entryDistance: null, runtimeObserved: false, tested: false },
            evidence: [{ source: "AST", locator: pr.artifact.path, confidence: 1 }],
          });
          draft.addEdge({
            id: makeId("edge", "response", routeId, responseId),
            kind: "CALLS",
            from: routeId,
            to: responseId,
            evidence: [{ source: "AST", locator: pr.artifact.path, confidence: 1 }],
          });
        };
        if (hasExplicitResponse) emitResponse();

        // Resolve handler's controller: scan route.handler for <ident>.<method> patterns.
        // Two shapes: Express `authController.login` (lowercase instance var → capitalize to the
        // class) and NestJS `AuthController.login` (the class name verbatim). Try both.
        const identMethodPattern = /\b([A-Za-z][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)/g;
        let match: RegExpExecArray | null;

        let controllerLinked = false;
        while ((match = identMethodPattern.exec(route.handler)) !== null) {
          const ident: string | undefined = match[1];
          if (!ident) continue;
          const candidates = [ident, ident.charAt(0).toUpperCase() + ident.slice(1)];
          for (const controllerName of candidates) {
            const controllerId = makeId("decl", controllerName);
            if (draft.getNode(controllerId)) {
              draft.addEdge({
                id: makeId("edge", "routesTo", routeId, controllerId),
                kind: "ROUTES_TO",
                from: routeId,
                to: controllerId,
                evidence: [{ source: "AST", locator: pr.artifact.path, confidence: 1 }],
              });
              controllerLinked = true;
              break;
            }
          }
        }

        // Framework controller methods (NestJS/Spring/FastAPI) serialize their return as the
        // response — so a route that reached a controller produces a RESPONSE even without
        // an explicit `res.json`. Idempotent (same response node/edge id) with the block above.
        if (controllerLinked && !hasExplicitResponse) emitResponse();

        // FastAPI path-operation fallback: when the route handler is a plain function (not
        // controller.method), link the route directly to the function declaration. This
        // bridges the gap for FastAPI where path operations are standalone functions, not
        // controller methods. Without this, the route has no ROUTES_TO edge and the
        // capability can never close beyond BACKEND_ROUTE.
        if (!controllerLinked) {
          const handlerFn = route.handler.trim();
          if (handlerFn && !handlerFn.includes(".")) {
            const fnId = makeId("decl", handlerFn);
            if (draft.getNode(fnId)) {
              draft.addEdge({
                id: makeId("edge", "routesTo", routeId, fnId),
                kind: "ROUTES_TO",
                from: routeId,
                to: fnId,
                evidence: [{ source: "AST", locator: pr.artifact.path, confidence: 1 }],
              });
              controllerLinked = true;
              if (!hasExplicitResponse) emitResponse();
            }
          }
        }
      }
    }
  }
}
