import { createRequire } from "node:module";
import type { LanguageAdapter, ParseResult, SymbolFact, ImportFact, CallFact, RouteFact } from "../index.js";
import type { CompilationContext } from "@rir/core";
import type { ArtifactIR, Span } from "@rir/ir";
import { makeId, hash64 } from "@rir/common";

type SyntaxNode = import("tree-sitter").SyntaxNode;

const require = createRequire(import.meta.url);
const ParserCtor = require("tree-sitter") as new () => {
  setLanguage(lang: unknown): void;
  parse(input: string): { rootNode: SyntaxNode };
};
const JavaLang = require("tree-sitter-java") as unknown;

function getSpan(node: SyntaxNode): Span {
  return {
    startLine: node.startPosition.row,
    startColumn: node.startPosition.column,
    endLine: node.endPosition.row,
    endColumn: node.endPosition.column,
  };
}

function hasPublicModifier(node: SyntaxNode): boolean {
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child && child.type === "modifiers") {
      for (let j = 0; j < child.childCount; j++) {
        const mod = child.child(j);
        if (mod && mod.text === "public") return true;
      }
    }
  }
  return false;
}

function extractSymbols(root: SyntaxNode): SymbolFact[] {
  const symbols: SymbolFact[] = [];
  const visit = (node: SyntaxNode): void => {
    if (node.type === "class_declaration") {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        symbols.push({
          name: nameNode.text,
          kind: "class",
          exported: hasPublicModifier(node),
          span: getSpan(node),
        });
      }
    } else if (node.type === "interface_declaration") {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        symbols.push({
          name: nameNode.text,
          kind: "interface",
          exported: hasPublicModifier(node),
          span: getSpan(node),
        });
      }
    } else if (node.type === "method_declaration") {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        symbols.push({ name: nameNode.text, kind: "method", exported: false, span: getSpan(node) });
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

function extractImports(root: SyntaxNode): ImportFact[] {
  const imports: ImportFact[] = [];
  const visit = (node: SyntaxNode): void => {
    if (node.type === "import_declaration") {
      const specifier = node.text
        .replace(/^import\s+/, "")
        .replace(/;\s*$/, "")
        .trim();
      imports.push({ specifier, imported: [], span: getSpan(node) });
    }
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) visit(child);
    }
  };
  visit(root);
  return imports;
}

function extractExports(root: SyntaxNode): string[] {
  const exports: string[] = [];
  const visit = (node: SyntaxNode): void => {
    if (
      (node.type === "class_declaration" || node.type === "interface_declaration") &&
      hasPublicModifier(node)
    ) {
      const nameNode = node.childForFieldName("name");
      if (nameNode) exports.push(nameNode.text);
    }
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) visit(child);
    }
  };
  visit(root);
  return exports;
}

function extractCalls(root: SyntaxNode): CallFact[] {
  const calls: CallFact[] = [];
  const visit = (node: SyntaxNode, enclosing?: string): void => {
    let childEnclosing = enclosing;

    if (node.type === "class_declaration" || node.type === "interface_declaration") {
      const nameNode = node.childForFieldName("name");
      if (nameNode) {
        childEnclosing = nameNode.text;
      }
    }

    if (node.type === "method_invocation") {
      let callee = "";
      const nameNode = node.childForFieldName("name");
      const objectNode = node.childForFieldName("object");
      if (objectNode && nameNode) {
        callee = `${objectNode.text}.${nameNode.text}`;
      } else if (nameNode) {
        callee = nameNode.text;
      }
      calls.push({ callee, enclosing: childEnclosing, span: getSpan(node) });
    }
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) visit(child, childEnclosing);
    }
  };
  visit(root, undefined);
  return calls;
}

const JAVA_MAPPING_VERB: Record<string, string> = {
  GetMapping: "GET",
  PostMapping: "POST",
  PutMapping: "PUT",
  DeleteMapping: "DELETE",
  PatchMapping: "PATCH",
};

function stripJavaString(text: string): string {
  return text.replace(/^"/, "").replace(/"$/, "");
}

function firstStringLiteral(node: SyntaxNode): string | undefined {
  if (node.type === "string_literal") return stripJavaString(node.text);
  for (let i = 0; i < node.childCount; i++) {
    const c = node.child(i);
    if (c) {
      const found = firstStringLiteral(c);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function annotationsOf(node: SyntaxNode): SyntaxNode[] {
  const mods = node.children.find((c) => c.type === "modifiers");
  return (mods?.children ?? []).filter((c) => c.type === "annotation" || c.type === "marker_annotation");
}

function annotationInfo(ann: SyntaxNode): { name: string; path: string } {
  const name = ann.childForFieldName("name")?.text ?? "";
  const args = ann.childForFieldName("arguments");
  return { name, path: (args && firstStringLiteral(args)) ?? "" };
}

function joinJavaPath(base: string, sub: string): string {
  const joined = [base.replace(/\/+$/, ""), sub.replace(/^\/+/, "")].filter(Boolean).join("/");
  return "/" + joined.replace(/^\/+/, "");
}

/** Spring annotation routes: @RequestMapping("/api") class + @GetMapping("/x") methods (TSPEC-A021). */
function extractRoutes(root: SyntaxNode): RouteFact[] {
  const routes: RouteFact[] = [];
  const visit = (node: SyntaxNode, base: string): void => {
    let classBase = base;
    if (node.type === "class_declaration") {
      for (const ann of annotationsOf(node)) {
        const info = annotationInfo(ann);
        if (info.name === "RequestMapping" && info.path) classBase = info.path;
      }
    }
    if (node.type === "method_declaration") {
      const handler = node.childForFieldName("name")?.text ?? "handler";
      for (const ann of annotationsOf(node)) {
        const info = annotationInfo(ann);
        const verb = JAVA_MAPPING_VERB[info.name] ?? (info.name === "RequestMapping" ? "ALL" : undefined);
        if (verb)
          routes.push({
            method: verb as RouteFact["method"],
            path: joinJavaPath(classBase, info.path),
            handler,
            span: getSpan(node),
          });
      }
    }
    for (let i = 0; i < node.childCount; i++) {
      const c = node.child(i);
      if (c) visit(c, classBase);
    }
  };
  visit(root, "");
  return routes;
}

const parser = new ParserCtor();
parser.setLanguage(JavaLang);

export class JavaAdapter implements LanguageAdapter {
  readonly language = "java";
  readonly extensions = [".java"];

  supports(path: string): boolean {
    return path.endsWith(".java");
  }

  parse(path: string, source: string, _ctx: CompilationContext): ParseResult {
    const tree = parser.parse(source);
    const artifact: ArtifactIR = {
      id: makeId("art", path),
      kind: "CODE",
      path,
      language: "java",
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
    };
  }
}
