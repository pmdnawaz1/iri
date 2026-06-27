import Parser from "tree-sitter";
import Python from "tree-sitter-python";
import type { LanguageAdapter, ParseResult, SymbolFact, ImportFact, CallFact } from "../index.js";
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

function isTopLevel(node: Parser.SyntaxNode, root: Parser.SyntaxNode): boolean {
  let current = node.parent;
  while (current && current !== root) {
    if (current.type === "class_definition" || current.type === "function_definition") return false;
    current = current.parent;
  }
  return current === root;
}

function hasMethodAncestor(node: Parser.SyntaxNode): boolean {
  let current = node.parent;
  while (current) {
    if (current.type === "class_definition") return true;
    current = current.parent;
  }
  return false;
}

function extractSymbols(root: Parser.SyntaxNode): SymbolFact[] {
  const symbols: SymbolFact[] = [];
  const visit = (node: Parser.SyntaxNode): void => {
    if (node.type === "class_definition") {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        symbols.push({
          name: nameNode.text,
          kind: "class",
          exported: isTopLevel(node, root),
          span: getSpan(node),
        });
      }
    } else if (node.type === "function_definition") {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        const kind = hasMethodAncestor(node) ? "method" : "function";
        symbols.push({
          name: nameNode.text,
          kind,
          exported: isTopLevel(node, root),
          span: getSpan(node),
        });
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
    if (node.type === "import_statement" || node.type === "import_from_statement") {
      const imported: string[] = [];
      const visitNames = (n: Parser.SyntaxNode): void => {
        if (n.type === "identifier" || n.type === "aliased_import") {
          const nameNode = n.type === "aliased_import" ? n.childForFieldName("name") : n;
          if (nameNode) imported.push(nameNode.text);
        }
        for (let i = 0; i < n.childCount; i++) {
          const child = n.child(i);
          if (child) visitNames(child);
        }
      };
      visitNames(node);

      let specifier = "";
      if (node.type === "import_from_statement") {
        const moduleNode = node.childForFieldName("module_name");
        if (moduleNode) specifier = moduleNode.text.replace(/^["']|["']$/g, "");
      } else {
        const firstChild = node.child(1);
        if (firstChild) specifier = firstChild.text.split(".")[0]!.replace(/^["']|["']$/g, "");
      }

      imports.push({ specifier, imported, span: getSpan(node) });
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
    if (isTopLevel(node, root)) {
      if (node.type === "class_definition" || node.type === "function_definition") {
        const nameNode = node.childForFieldName("name");
        if (nameNode) exports.push(nameNode.text);
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
  const visit = (node: Parser.SyntaxNode): void => {
    if (node.type === "call") {
      const funcNode = node.childForFieldName("function");
      if (funcNode) {
        calls.push({ callee: funcNode.text, span: getSpan(node) });
      }
    }
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) visit(child);
    }
  };
  visit(root);
  return calls;
}

const parser = new Parser();
parser.setLanguage(Python as unknown as Parser.Language);

export class PythonAdapter implements LanguageAdapter {
  readonly language = "python";
  readonly extensions = [".py"];

  supports(path: string): boolean {
    return path.endsWith(".py");
  }

  parse(path: string, source: string, _ctx: CompilationContext): ParseResult {
    const tree = parser.parse(source);
    const artifact: ArtifactIR = {
      id: makeId("art", path),
      kind: "CODE",
      path,
      language: "python",
      hash: hash64(source),
    };
    return {
      artifact,
      symbols: extractSymbols(tree.rootNode),
      imports: extractImports(tree.rootNode),
      exports: extractExports(tree.rootNode),
      calls: extractCalls(tree.rootNode),
      routes: [],
    };
  }
}
