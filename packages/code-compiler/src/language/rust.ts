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
    if (node.type === "struct_item") {
      const nameNode = getChildByType(node, "type_identifier");
      if (nameNode) {
        symbols.push({
          name: nameNode.text,
          kind: "class",
          exported: hasPubModifier(node),
          span: getSpan(node),
          docstring: extractCommentDocstring(node),
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
          docstring: extractCommentDocstring(node),
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
          docstring: extractCommentDocstring(node),
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

    if (node.type === "impl_item") {
      const typeNode = getChildByType(node, "type_identifier");
      if (typeNode) {
        childEnclosing = typeNode.text;
      }
    } else if (node.type === "function_item" && enclosing === undefined) {
      const nameNode = getChildByType(node, "identifier");
      if (nameNode) {
        childEnclosing = nameNode.text;
      }
    }

    if (node.type === "call_expression") {
      const funcNode = getChildByType(node, "field_expression") ?? getChildByType(node, "identifier");
      if (funcNode) {
        const strArgs = extractStringArgs(node.childForFieldName("arguments"));
        calls.push({ callee: funcNode.text, enclosing: childEnclosing, span: getSpan(node), arguments: strArgs.length > 0 ? strArgs : undefined });
      }
    } else if (node.type === "macro_invocation") {
      const macroNode = getChildByType(node, "identifier");
      if (macroNode) {
        const strArgs = extractStringArgs(node.childForFieldName("arguments"));
        calls.push({ callee: macroNode.text + "!", enclosing: childEnclosing, span: getSpan(node), arguments: strArgs.length > 0 ? strArgs : undefined });
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
      controlFlows: [],
      source,
    };
  }
}
