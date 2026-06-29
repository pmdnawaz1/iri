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

export const nextjsResolver: FrameworkResolver = {
  name: "nextjs",
  detect(_context: ResolutionContext): boolean {
    return true; // Simple check, or check for next dependency
  },
  // File-based routing has no name reference to resolve; routes are emitted by extract().
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
      if (!/^route\.(t|j)sx?$/.test(file)) continue;

      const routePath = fileBasedPath(norm.slice(0, norm.lastIndexOf("/")));

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
    }

    return { nodes, references };
  },
};
