import type { Node } from "../memory-queries.js";
import type { FrameworkResolver, UnresolvedRef, ResolutionContext } from "../types.js";

const ROUTING_ROOT_MARKERS = new Set(["api", "routes", "app", "pages", "handlers"]);
const HTTP_VERB_EXPORTS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]);

/** Derive an HTTP path from a `route.ts` file's directory (Medusa / Next.js App Router). */
function fileBasedPath(dir: string): string {
  const segments = dir.split("/").filter(Boolean);
  let start = -1;
  for (let i = segments.length - 1; i >= 0; i--) {
    if (ROUTING_ROOT_MARKERS.has(segments[i]!.toLowerCase())) {
      start = i + 1;
      break;
    }
  }
  const rel = start >= 0 ? segments.slice(start) : segments.slice(-1);
  const conv = rel
    .filter((s) => !/^\(.*\)$/.test(s)) // drop Next.js route groups, e.g. (auth)
    .map((s) => s.replace(/^\[\.\.\.(.+)\]$/, "*").replace(/^\[(.+)\]$/, ":$1"));
  return "/" + conv.join("/");
}

/**
 * Extract the page route path from a `page.tsx` file's directory.
 * e.g. `app/dashboard/settings/page.tsx` → `/dashboard/settings`
 */
function pagePath(dir: string): string {
  const segments = dir.split("/").filter(Boolean);
  // Find the "app" or "pages" root
  let start = -1;
  for (let i = 0; i < segments.length; i++) {
    const lower = segments[i]!.toLowerCase();
    if (lower === "app" || lower === "pages") {
      start = i + 1;
      break;
    }
  }
  if (start === -1) start = Math.max(0, segments.length - 2);
  const rel = segments.slice(start);
  const conv = rel
    .filter((s) => !/^\(.*\)$/.test(s)) // drop route groups
    .map((s) => s.replace(/^\[\.\.\.(.+)\]$/, "*").replace(/^\[(.+)\]$/, ":$1"));
  return "/" + conv.join("/");
}

export const nextjsResolver: FrameworkResolver = {
  name: "nextjs",
  detect(_context: ResolutionContext): boolean {
    return true;
  },
  resolve(): null {
    return null;
  },
  extract(context: ResolutionContext): { nodes: Node[]; references: UnresolvedRef[] } {
    const nodes: Node[] = [];
    const references: UnresolvedRef[] = [];

    for (const filePath of context.getAllFiles()) {
      if (typeof filePath !== "string") continue;
      const norm = filePath.replace(/\\/g, "/");
      const file = norm.slice(norm.lastIndexOf("/") + 1);
      const dir = norm.slice(0, norm.lastIndexOf("/"));

      // --- route.ts / route.tsx (API routes) ---
      if (/^route\.(t|j)sx?$/.test(file)) {
        const routePath = fileBasedPath(dir);
        const fileNodes = context.getNodesInFile(filePath);
        for (const node of fileNodes) {
          if (
            (node.kind === "function" || node.kind === "variable" || node.kind === "method") &&
            node.isExported
          ) {
            const name = node.name;
            if (HTTP_VERB_EXPORTS.has(name)) {
              const routeNodeId = `route:${filePath}:${node.startLine}:${name}:${routePath}`;
              nodes.push({
                id: routeNodeId,
                kind: "route",
                name: `${name} ${routePath}`,
                qualifiedName: `${filePath}::${name}:${routePath}`,
                filePath,
                startLine: node.startLine,
                endLine: node.startLine,
                startColumn: 0,
                endColumn: 10,
                language: "typescript",
                updatedAt: Date.now(),
              } as any);

              references.push({
                fromNodeId: routeNodeId,
                referenceName: name,
                referenceKind: "references",
                line: node.startLine,
                column: 0,
                filePath,
                language: "typescript",
              });
            }
          }
        }
        continue;
      }

      // --- page.tsx / page.ts (Next.js page components) ---
      if (/^page\.(t|j)sx?$/.test(file)) {
        const route = pagePath(dir);
        const fileNodes = context.getNodesInFile(filePath);
        for (const node of fileNodes) {
          if (
            (node.kind === "function" || node.kind === "variable") &&
            node.isExported
          ) {
            const componentNodeId = `component:${filePath}:${node.startLine}:${node.name}`;
            nodes.push({
              id: componentNodeId,
              kind: "component",
              name: node.name,
              qualifiedName: `${filePath}::${node.name}`,
              filePath,
              startLine: node.startLine,
              endLine: node.startLine,
              startColumn: 0,
              endColumn: 10,
              language: "typescript",
              updatedAt: Date.now(),
            } as any);

            // FRONTEND_ROUTE node for the page
            const frontendRouteId = `frontend_route:${filePath}:${route}`;
            nodes.push({
              id: frontendRouteId,
              kind: "frontend_route",
              name: route,
              qualifiedName: `${filePath}::${route}`,
              filePath,
              startLine: 0,
              endLine: 0,
              startColumn: 0,
              endColumn: 0,
              language: "typescript",
              updatedAt: Date.now(),
            } as any);

            // RENDERED_UI node for the page
            const renderedUiId = `rendered_ui:${filePath}:${route}`;
            nodes.push({
              id: renderedUiId,
              kind: "rendered_ui",
              name: `Page: ${route}`,
              qualifiedName: `${filePath}::rendered::${route}`,
              filePath,
              startLine: node.startLine,
              endLine: node.startLine,
              startColumn: 0,
              endColumn: 0,
              language: "typescript",
              updatedAt: Date.now(),
            } as any);

            // Link page component to its FRONTEND_ROUTE
            references.push({
              fromNodeId: frontendRouteId,
              referenceName: node.name,
              referenceKind: "renders",
              line: node.startLine,
              column: 0,
              filePath,
              language: "typescript",
            });

            // Link component to RENDERED_UI
            references.push({
              fromNodeId: componentNodeId,
              referenceName: route,
              referenceKind: "renders",
              line: node.startLine,
              column: 0,
              filePath,
              language: "typescript",
            });
          }
        }

        // Detect fetch() calls in page files for API_CALL nodes
        const fileCalls = context.getCallsInFile?.(filePath) ?? [];
        for (const call of fileCalls) {
          if (typeof call.callee === "string" && call.callee.includes("fetch")) {
            const apiCallNodeId = `api_call:${filePath}:${call.line ?? 0}`;
            nodes.push({
              id: apiCallNodeId,
              kind: "api_call",
              name: call.callee,
              qualifiedName: `${filePath}::fetch::${call.line ?? 0}`,
              filePath,
              startLine: call.line ?? 0,
              endLine: call.line ?? 0,
              startColumn: 0,
              endColumn: 0,
              language: "typescript",
              updatedAt: Date.now(),
            } as any);
          }
        }
        continue;
      }
    }

    return { nodes, references };
  },
};
