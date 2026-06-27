import Parser from "tree-sitter";
import Rust from "tree-sitter-rust";
import type { LanguageAdapter, ParseResult, SymbolFact, ImportFact, CallFact } from "../index.js";
import type { CompilationContext } from "@rir/core";
import type { ArtifactIR, Span } from "@rir/ir";
import { makeId, hash64 } from "@rir/common";
const RustLang = Rust as unknown as Parser.Language;
function getSpan(node: Parser.SyntaxNode): Span {
  return {
    startLine: node.startPosition.row,
    startColumn: node.startPosition.column,
    endLine: node.endPosition.row,
    endColumn: node.endPosition.column,
  };
}
function hasPubModifier(node: Parser.SyntaxNode): boolean {
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child && child.type === "visibility_modifier" && child.text === "pub") return true;
  }
  return false;
}
function getChildByType(node: Parser.SyntaxNode, type: string): Parser.SyntaxNode | null {
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child && child.type === type) return child;
  }
  return null;
}
function extractSymbols(root: Parser.SyntaxNode): SymbolFact[] {
  const symbols: SymbolFact[] = [];
  const visit = (node: Parser.SyntaxNode): void => {
    if (node.type === "struct_item") {
      const nameNode = getChildByType(node, "type_identifier");
      if (nameNode) {
        symbols.push({
          name: nameNode.text,
          kind: "class",
          exported: hasPubModifier(node),
          span: getSpan(node),
        });
      }
    } else if (node.type === "function_item") {
      const nameNode = getChildByType(node, "identifier");
      if (nameNode) {
        const isMethod = node.parent?.type === "declaration_list" && node.parent.parent?.type === "impl_item";
        symbols.push({
          name: nameNode.text,
          kind: isMethod ? "method" : "function",
          exported: hasPubModifier(node),
          span: getSpan(node),
        });
      }
    } else if (node.type === "trait_item") {
      const nameNode = getChildByType(node, "type_identifier");
      if (nameNode) {
        symbols.push({
          name: nameNode.text,
          kind: "interface",
          exported: hasPubModifier(node),
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
    if (node.type === "use_declaration") {
      const pathNode = getChildByType(node, "scoped_identifier") ?? getChildByType(node, "identifier");
      if (pathNode) {
        imports.push({ specifier: pathNode.text, imported: [], span: getSpan(node) });
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
    if (hasPubModifier(node)) {
      if (node.type === "struct_item" || node.type === "function_item" || node.type === "trait_item") {
        const nameNode = getChildByType(node, "type_identifier") ?? getChildByType(node, "identifier");
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
    if (node.type === "call_expression") {
      const funcNode = getChildByType(node, "field_expression") ?? getChildByType(node, "identifier");
      if (funcNode) {
        calls.push({ callee: funcNode.text, span: getSpan(node) });
      }
    } else if (node.type === "macro_invocation") {
      const macroNode = getChildByType(node, "identifier");
      if (macroNode) {
        calls.push({ callee: macroNode.text + "!", span: getSpan(node) });
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
parser.setLanguage(RustLang);
export class RustAdapter implements LanguageAdapter {
  readonly language = "rust";
  readonly extensions = [".rs"];
  supports(path: string): boolean {
    return path.endsWith(".rs");
  }
  parse(path: string, source: string, _ctx: CompilationContext): ParseResult {
    const tree = parser.parse(source);
    const artifact: ArtifactIR = {
      id: makeId("art", path),
      kind: "CODE",
      path,
      language: "rust",
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
