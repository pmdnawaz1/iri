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
        calls.push({
          callee: funcNode.text,
          enclosing: childEnclosing,
          span: getSpan(node),
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
          routes.push({ method, path: stripGoString(first.text), handler, span: getSpan(node) });
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
    };
  }
}
