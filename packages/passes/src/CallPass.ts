/**
 * CallPass — TSPEC-P02
 *
 * Lifts ParseResult symbols into IR declaration nodes (classified) and CallFacts
 * into CALLS edges. Deterministic, non-semantic beyond the fixed classification rule.
 * Per ADR-0016.
 */

import type { CompilationContext, IRDraft, SymbolFact } from "@rir/core";
import type { NodeKind } from "@rir/ir";
import { makeId } from "@rir/common";
import { AbstractPass, PASS_PRIORITY } from "./base.js";

const DECORATOR_KIND: Readonly<Record<string, NodeKind>> = {
  Controller: "CONTROLLER",
  RestController: "CONTROLLER",
  Injectable: "SERVICE",
  Service: "SERVICE",
  Repository: "REPOSITORY",
  Middleware: "MIDDLEWARE",
  Guard: "MIDDLEWARE",
  UseGuards: "MIDDLEWARE",
};

function classify(sym: SymbolFact): NodeKind {
  if (sym.kind === "class") {
    // Decorator-based classification takes priority (explicit framework annotation).
    if (sym.decorators) {
      for (const dec of sym.decorators) {
        const kind = DECORATOR_KIND[dec.name];
        if (kind) return kind;
      }
    }
    // Fall back to name suffix (convention-based frameworks like Express).
    if (sym.name.endsWith("Controller")) return "CONTROLLER";
    if (sym.name.endsWith("Service")) return "SERVICE";
    if (sym.name.endsWith("Repository")) return "REPOSITORY";
    if (sym.name.endsWith("Middleware") || sym.name.endsWith("Auth") || sym.name.endsWith("Guard"))
      return "MIDDLEWARE";
    return "CLASS";
  }
  if (sym.kind === "function") return "FUNCTION";
  if (sym.kind === "method") return "METHOD";
  if (sym.kind === "interface") return "INTERFACE";
  if (sym.kind === "type" || sym.kind === "type_alias") return "TYPE_ALIAS";
  if (sym.kind === "variable") return "VARIABLE";
  if (sym.kind === "property") return "PROPERTY";
  if (sym.kind === "enum") return "ENUM";
  if (sym.kind === "constant") return "CONSTANT";
  if (sym.kind === "field") return "FIELD";
  if (sym.kind === "enum_member") return "ENUM_MEMBER";
  if (sym.kind === "import") return "IMPORT";
  return "CLASS";
}

/**
 * CallPass orchestrates all non-import syntax-driven relationships (calls, hierarchy, control flow, etc).
 * It was expanded in PR1 to construct the full 15+ edge taxonomy from AST facts (including decorates, contains, instantiates, and control flows).
 */
export class CallPass extends AbstractPass {
  readonly name = "CallPass" as const;

  override get priority(): number {
    return PASS_PRIORITY.CallPass;
  }

  override supports(): boolean {
    return true;
  }

  override run(ctx: CompilationContext, draft: IRDraft): void {
    // Phase 1 — declaration nodes (all files first, so cross-file calls resolve)
    for (const pr of ctx.parseResults ?? []) {
      draft.addArtifact(pr.artifact);

      // Split source into lines for sourceText extraction (per-symbol code snippets).
      const sourceLines = pr.source ? pr.source.split("\n") : null;

      for (const sym of pr.symbols) {
        const nodeId =
          sym.kind === "import"
            ? makeId("import", pr.artifact.id, sym.qualifiedName ?? sym.name)
            : makeId("decl", sym.qualifiedName ?? sym.name);

        // Extract the symbol's source text from the file content using its span.
        let sourceText: string | undefined;
        if (sourceLines && sym.span) {
          const s0 = Math.max(0, sym.span.startLine - 1);
          const s1 = Math.min(sourceLines.length, sym.span.endLine);
          const snippet = sourceLines.slice(s0, s1).join("\n");
          sourceText = snippet.length > 2000 ? snippet.slice(0, 2000) + "\n// ..." : snippet;
        }

        draft.addNode({
          id: nodeId,
          kind: classify(sym),
          name: sym.name,
          language: pr.artifact.language,
          artifactId: pr.artifact.id,
          span: sym.span,
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
          signature: sym.signature,
          returnType: sym.returnType,
          typeParameters: sym.typeParameters,
          visibility: sym.visibility,
          isExported: sym.exported,
          isAsync: sym.isAsync,
          isStatic: sym.isStatic,
          isAbstract: sym.isAbstract,
          qualifiedName: sym.qualifiedName,
          filePath: pr.artifact.path,
          decorators: sym.decorators,
          docstring: sym.docstring,
          sourceText: sourceText ?? sym.sourceText,
        });
      }
    }

    // Phase 2 — CALLS edges
    for (const pr of ctx.parseResults ?? []) {
      for (const call of pr.calls) {
        if (!call.enclosing) continue;

        const from = makeId("decl", call.enclosing);
        if (!draft.getNode(from)) continue;

        if (call.isNew) {
          const targetClass = call.callee;
          const to = makeId("decl", targetClass);
          if (draft.getNode(to)) {
            draft.addEdge({
              id: makeId("edge", "instantiates", from, to),
              kind: "INSTANTIATES",
              from,
              to,
              evidence: [{ source: "AST", locator: pr.artifact.path, confidence: 1 }],
            });
          }
          continue;
        }

        // Resolve target: split callee on ".", find the first non-"this" segment
        // as the receiver whose class name we capitalize to get the target.
        // e.g. "this.authService.login" → receiver = "authService" → "AuthService"
        const segments = call.callee.split(".");
        const receiverSegments = segments.slice(0, -1).filter((s) => s !== "this");

        if (receiverSegments.length === 0) continue; // local call or global, ignore for now

        const receiverName = receiverSegments[receiverSegments.length - 1];
        if (!receiverName) continue;
        const targetClass = receiverName.charAt(0).toUpperCase() + receiverName.slice(1);
        const to = makeId("decl", targetClass);

        if (draft.getNode(to)) {
          let edgeKind: import("@rir/ir").EdgeKind = "CALLS";
          const fromNode = draft.getNode(from);
          const toNode = draft.getNode(to);

          if (fromNode && toNode) {
            if (fromNode.kind === "CONTROLLER" && toNode.kind === "SERVICE") edgeKind = "ROUTES_TO";
            if (fromNode.kind === "SERVICE" && toNode.kind === "REPOSITORY") edgeKind = "ROUTES_TO";
            if (fromNode.kind === "MIDDLEWARE" && toNode.kind === "CONTROLLER") edgeKind = "WRAPS";
          }

          draft.addEdge({
            id: makeId("edge", edgeKind.toLowerCase(), from, to),
            kind: edgeKind,
            from,
            to,
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

    // Phase 3 — CONTAINS edges
    for (const pr of ctx.parseResults ?? []) {
      for (const sym of pr.symbols) {
        const qName = sym.qualifiedName ?? sym.name;
        if (!qName.includes("::")) continue;

        const parts = qName.split("::");
        const parentQName = parts.slice(0, -1).join("::");

        const parentId = makeId("decl", parentQName);
        const childId = makeId("decl", qName);

        if (draft.getNode(parentId) && draft.getNode(childId)) {
          draft.addEdge({
            id: makeId("edge", "contains", parentId, childId),
            kind: "CONTAINS",
            from: parentId,
            to: childId,
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

    // Phase 4 — EXTENDS and IMPLEMENTS edges
    for (const pr of ctx.parseResults ?? []) {
      for (const sym of pr.symbols) {
        if (!sym.extends && !sym.implements) continue;
        const from = makeId("decl", sym.qualifiedName ?? sym.name);
        if (!draft.getNode(from)) continue;

        if (sym.extends) {
          for (const ext of sym.extends) {
            const targetClass = ext.charAt(0).toUpperCase() + ext.slice(1);
            const to = makeId("decl", targetClass);
            if (draft.getNode(to)) {
              draft.addEdge({
                id: makeId("edge", "extends", from, to),
                kind: "EXTENDS",
                from,
                to,
                evidence: [{ source: "AST", locator: pr.artifact.path, confidence: 1 }],
              });
            }
          }
        }

        if (sym.implements) {
          for (const impl of sym.implements) {
            const targetIface = impl.charAt(0).toUpperCase() + impl.slice(1);
            const to = makeId("decl", targetIface);
            if (draft.getNode(to)) {
              draft.addEdge({
                id: makeId("edge", "implements", from, to),
                kind: "IMPLEMENTS",
                from,
                to,
                evidence: [{ source: "AST", locator: pr.artifact.path, confidence: 1 }],
              });
            }
          }
        }
      }
    }

    // Pre-compute name to ID map to resolve types.
    // Keyed by name+kind to avoid collisions (e.g. SERVICE vs COMPONENT with same name).
    // When multiple nodes share the same name+kind, only the first is kept.
    const nameKindToId = new Map<string, string>();
    const nameToId = new Map<string, string>();
    for (const node of draft.getNodes()) {
      if (node.name) {
        if (!nameKindToId.has(`${node.name}:${node.kind}`)) {
          nameKindToId.set(`${node.name}:${node.kind}`, node.id);
        }
        if (!nameToId.has(node.name)) nameToId.set(node.name, node.id);
      }
    }
    const resolveName = (name: string, kind?: string): string | undefined => {
      if (kind) {
        const composite = nameKindToId.get(`${name}:${kind}`);
        if (composite) return composite;
      }
      return nameToId.get(name);
    };

    // Phase 5 — REFERENCES edges
    for (const pr of ctx.parseResults ?? []) {
      for (const sym of pr.symbols) {
        const from = makeId("decl", sym.qualifiedName ?? sym.name);
        if (!draft.getNode(from)) continue;

        const typesToExtract = [sym.returnType, sym.signature].filter(Boolean);
        const referencedNames = new Set<string>();

        for (const typeStr of typesToExtract) {
          if (!typeStr) continue;
          const words = typeStr.match(/[a-zA-Z_]\w*/g) || [];
          for (const word of words) {
            if (nameToId.has(word)) referencedNames.add(word);
          }
        }

        for (const refName of referencedNames) {
          const to = resolveName(refName);
          if (to && from !== to) {
            draft.addEdge({
              id: makeId("edge", "references", from, to),
              kind: "REFERENCES",
              from,
              to,
              evidence: [{ source: "AST", locator: pr.artifact.path, confidence: 1 }],
            });
          }
        }
      }
    }

    // Phase 6 — DECORATES edges
    for (const pr of ctx.parseResults ?? []) {
      for (const sym of pr.symbols) {
        if (!sym.decorators) continue;
        const targetId = makeId("decl", sym.qualifiedName ?? sym.name);
        if (!draft.getNode(targetId)) continue;

        for (const dec of sym.decorators) {
          // Decorators are classified as CLASS (no suffix match) or FUNCTION
          let decoratorId = resolveName(dec.name, "CLASS");
          if (!decoratorId) decoratorId = resolveName(dec.name, "FUNCTION");
          if (decoratorId) {
            draft.addEdge({
              id: makeId("edge", "decorates", decoratorId, targetId),
              kind: "DECORATES",
              from: decoratorId,
              to: targetId,
              evidence: [{ source: "AST", locator: pr.artifact.path, confidence: 1 }],
            });
          }
        }
      }
    }

    // Phase 7 — Control Flow (CATCHES and THROWS edges)
    for (const pr of ctx.parseResults ?? []) {
      if (!pr.controlFlows) continue;
      for (const flow of pr.controlFlows) {
        if (!flow.enclosing || !flow.typeName) continue;
        const from = makeId("decl", flow.enclosing);
        if (!draft.getNode(from)) continue;

        // Find the node representing the error type (e.g. "SomeError")
        // Error classes are typically classified as CLASS nodes
        const to = resolveName(flow.typeName, "CLASS");
        if (!to) continue;

        const edgeKind = flow.kind === "THROW" ? "THROWS" : "CATCHES";
        draft.addEdge({
          id: makeId("edge", edgeKind.toLowerCase(), from, to),
          kind: edgeKind,
          from,
          to,
          evidence: [{ source: "AST", locator: pr.artifact.path, confidence: 1 }],
        });
      }
    }
  }
}
