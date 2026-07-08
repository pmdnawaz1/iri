import Parser from "tree-sitter";
import Go from "tree-sitter-go";
import type { LanguageAdapter, ParseResult, SymbolFact, ImportFact, CallFact, RouteFact } from "../index.js";
import type { CompilationContext } from "@rir/core";
import type { ArtifactIR, Span } from "@rir/ir";
import { makeId, hash64 } from "@rir/common";
function getSpan(node: Parser.SyntaxNode): Span {
  return {
    startLine: node.startPosition.row,
    startColumn: node.startPosition.column,
    endLine: node.endPosition.row,
    endColumn: node.endPosition.column,
  };
}
function isExported(name: string): boolean {
  return name.length > 0 && name[0] === name[0]!.toUpperCase();
}
function extractCommentDocstring(node: Parser.SyntaxNode): string | undefined {
  const comments: string[] = [];
  let sibling = node.previousSibling;
  while (sibling) {
    const t = sibling.type;
    if (t === "comment" || t === "line_comment" || t === "block_comment" || t === "documentation_comment") {
      comments.unshift(sibling.text);
    } else if (sibling.text.trim() === "") {
      // skip whitespace
    } else {
      break;
    }
    sibling = sibling.previousSibling;
  }
  if (comments.length === 0) return undefined;
  let text = comments.join("\n");
  text = text.replace(/^\/\*\*?/, "").replace(/\*\/$/s, "").replace(/^\s*\*\s?/gm, "").replace(/^\s*\/\/\/?\s?/gm, "").trim();
  return text || undefined;
}
function extractSymbols(root: Parser.SyntaxNode): SymbolFact[] {
  const symbols: SymbolFact[] = [];
  const visit = (node: Parser.SyntaxNode): void => {
    if (node.type === "function_declaration") {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        symbols.push({
          name: nameNode.text,
          kind: "function",
          exported: isExported(nameNode.text),
          span: getSpan(node),
          docstring: extractCommentDocstring(node),
        });
      }
    } else if (node.type === "method_declaration") {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        symbols.push({
          name: nameNode.text,
          kind: "method",
          exported: isExported(nameNode.text),
          span: getSpan(node),
          docstring: extractCommentDocstring(node),
        });
      }
    } else if (node.type === "type_declaration") {
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child && child.type === "type_spec") {
          const nameNode = child.childForFieldName("name");
          const typeNode = child.childForFieldName("type");
          if (nameNode && typeNode && typeNode.type === "struct_type") {
            symbols.push({
              name: nameNode.text,
              kind: "class",
              exported: isExported(nameNode.text),
              span: getSpan(child),
              docstring: extractCommentDocstring(node),
            });
          }
        }
      }
    }
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) visit(child);
    }
  };
  visit(root);
  return symbols;
}
function extractImports(root: Parser.SyntaxNode): ImportFact[] {
  const imports: ImportFact[] = [];
  const visit = (node: Parser.SyntaxNode): void => {
    if (node.type === "import_spec") {
      const pathNode = node.childForFieldName("path");
      if (pathNode) {
        const specifier = pathNode.text.replace(/^["']|["']$/g, "");
        imports.push({ specifier, imported: [], span: getSpan(node) });
      }
    }
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) visit(child);
    }
  };
  visit(root);
  return imports;
}
function extractExports(root: Parser.SyntaxNode): string[] {
  const exports: string[] = [];
  const visit = (node: Parser.SyntaxNode): void => {
    if (node.type === "function_declaration" || node.type === "method_declaration") {
      const nameNode = node.childForFieldName("name");
      if (nameNode && isExported(nameNode.text)) exports.push(nameNode.text);
    } else if (node.type === "type_declaration") {
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child && child.type === "type_spec") {
          const nameNode = child.childForFieldName("name");
          if (nameNode && isExported(nameNode.text)) exports.push(nameNode.text);
        }
      }
    }
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) visit(child);
    }
  };
  visit(root);
  return exports;
}
function extractStringArgs(argsNode: Parser.SyntaxNode | null): string[] {
  if (!argsNode) return [];
  const strArgs: string[] = [];
  for (const child of argsNode.namedChildren) {
    if (!child.type.includes("string")) break;
    strArgs.push(child.text.replace(/^[a-zA-Z@]*['"`]+/, "").replace(/['"`]+$/, ""));
    if (strArgs.length >= 5) break;
  }
  return strArgs;
}

function extractCalls(root: Parser.SyntaxNode): CallFact[] {
  const calls: CallFact[] = [];
  const visit = (node: Parser.SyntaxNode, enclosing?: string): void => {
    let childEnclosing = enclosing;

    if (node.type === "method_declaration") {
      const receiverNode = node.childForFieldName("receiver");
      if (receiverNode) {
        const findTypeIdentifier = (n: Parser.SyntaxNode): Parser.SyntaxNode | null => {
          if (n.type === "type_identifier") return n;
          for (let j = 0; j < n.childCount; j++) {
            const child = n.child(j);
            if (child) {
              const res = findTypeIdentifier(child);
              if (res) return res;
            }
          }
          return null;
        };
        const typeId = findTypeIdentifier(receiverNode);
        if (typeId) childEnclosing = typeId.text;
      }
    } else if (node.type === "function_declaration" && enclosing === undefined) {
      const nameNode = node.childForFieldName("name");
      if (nameNode) childEnclosing = nameNode.text;
    }

    if (node.type === "call_expression") {
      const funcNode = node.childForFieldName("function");
      if (funcNode) {
        const strArgs = extractStringArgs(node.childForFieldName("arguments"));
        calls.push({
          callee: funcNode.text,
          enclosing: childEnclosing,
          span: getSpan(node),
          arguments: strArgs.length > 0 ? strArgs : undefined,
        });
      }
    }

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) visit(child, childEnclosing);
    }
  };

  visit(root, undefined);
  return calls;
}
const GO_VERB_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HANDLE", "HANDLEFUNC"]);

function stripGoString(text: string): string {
  return text.replace(/^[`"]/, "").replace(/[`"]$/, "");
}

/** Go router routes: r.GET("/x", h), e.POST(...), mux.HandleFunc("/x", h) (TSPEC-A021). */
function extractRoutes(root: Parser.SyntaxNode): RouteFact[] {
  const routes: RouteFact[] = [];
  const visit = (node: Parser.SyntaxNode): void => {
    if (node.type === "call_expression") {
      const fn = node.childForFieldName("function");
      if (fn?.type === "selector_expression") {
        const field = fn.childForFieldName("field")?.text ?? "";
        const args = node.childForFieldName("arguments");
        const first = args?.namedChild(0);
        if (GO_VERB_METHODS.has(field.toUpperCase()) && first?.type === "interpreted_string_literal") {
          const verb = field.toUpperCase();
          const method = verb === "HANDLE" || verb === "HANDLEFUNC" ? "ALL" : verb;
          const handler = args?.namedChild(1)?.text ?? field;
          routes.push({
            method: method as RouteFact["method"],
            path: stripGoString(first.text),
            handler,
            span: getSpan(node),
          });
        }
      }
    }
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) visit(child);
    }
  };
  visit(root);
  return routes;
}

/** Detect worker/task patterns: functions named Handle/Process/Run/Execute/Task or
 *  with worker-like suffixes (e.g. SendEmailWorker, ProcessPaymentTask).
 *  These become WORKER entrypoints for async/background processing (W1).
 *  Exported but not yet wired into the extraction pipeline. */
export function extractWorkerPatterns(root: Parser.SyntaxNode): SymbolFact[] {
  const workers: SymbolFact[] = [];
  const WORKER_NAMES = /^(handle|process|run|execute|task|job|worker|consume|enqueue|dispatch|schedule|cron|process_|handle_|run_|execute_)/i;
  const WORKER_SUFFIXES = /(worker|task|job|handler|consumer|processor)$/i;

  const visit = (node: Parser.SyntaxNode): void => {
    if (node.type === "function_declaration") {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        const name = nameNode.text;
        if (WORKER_NAMES.test(name) || WORKER_SUFFIXES.test(name)) {
          workers.push({
            name,
            kind: "function",
            exported: isExported(name),
            span: getSpan(node),
          });
        }
      }
    }
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) visit(child);
    }
  };
  visit(root);
  return workers;
}

const parser = new Parser();
parser.setLanguage(Go as unknown as Parser.Language);
export class GoAdapter implements LanguageAdapter {
  readonly language = "go";
  readonly extensions = [".go"];
  supports(path: string): boolean {
    return path.endsWith(".go");
  }
  parse(path: string, source: string, _ctx: CompilationContext): ParseResult {
    const tree = parser.parse(source);
    const artifact: ArtifactIR = {
      id: makeId("art", path),
      kind: "CODE",
      path,
      language: "go",
      hash: hash64(source),
    };
    return {
      artifact,
      symbols: extractSymbols(tree.rootNode),
      imports: extractImports(tree.rootNode),
      exports: extractExports(tree.rootNode),
      calls: extractCalls(tree.rootNode),
      routes: extractRoutes(tree.rootNode),
      controlFlows: [],
      source,
    };
  }
}
