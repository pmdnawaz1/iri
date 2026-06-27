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

        // Response producer (ADR-0019): a handler that sends a response yields a RESPONSE
        // node reachable from the route, so the backend tier can close.
        if (/\b(res|reply|response|ctx)\.(json|send|status|code|end|render)\b/.test(route.handler)) {
          const responseId = makeId("response", routeId);
          draft.addNode({
            id: responseId,
            kind: "RESPONSE",
            name: `response ${route.method} ${route.path}`,
            language: pr.artifact.language,
            artifactId: pr.artifact.id,
            span: route.span,
            hash: "0",
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
        }

        // Resolve handler's controller: scan route.handler for <ident>.<method> patterns
        const identMethodPattern = /\b([a-z][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)/g;
        let match: RegExpExecArray | null;

        while ((match = identMethodPattern.exec(route.handler)) !== null) {
          const ident: string | undefined = match[1];
          if (!ident) continue;
          // Upper-case first letter to get the class name
          const controllerName = ident.charAt(0).toUpperCase() + ident.slice(1);
          const controllerId = makeId("decl", controllerName);

          if (draft.getNode(controllerId)) {
            draft.addEdge({
              id: makeId("edge", "routesTo", routeId, controllerId),
              kind: "ROUTES_TO",
              from: routeId,
              to: controllerId,
              evidence: [
                {
                  source: "AST",
                  locator: pr.artifact.path,
                  confidence: 1,
                },
              ],
            });
          }
        }
      }
    }
  }
}
