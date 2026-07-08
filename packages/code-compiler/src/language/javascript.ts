import { createRequire } from "node:module";
import type { LanguageAdapter, ParseResult, SymbolFact, ImportFact, CallFact, RouteFact } from "../index.js";
import type { CompilationContext } from "@rir/core";
import type { ArtifactIR, Span } from "@rir/ir";
import { makeId, hash64 } from "@rir/common";
import { extractDocstring } from "./typescript.js";

const require = createRequire(import.meta.url);
const ts = require("typescript") as typeof import("typescript");

function getSpan(sf: import("typescript").SourceFile, node: import("typescript").Node): Span {
  const start = ts.getLineAndCharacterOfPosition(sf, node.getStart(sf));
  const end = ts.getLineAndCharacterOfPosition(sf, node.getEnd());
  return { startLine: start.line, startColumn: start.character, endLine: end.line, endColumn: end.character };
}

function extractSymbols(sf: import("typescript").SourceFile): SymbolFact[] {
  const symbols: SymbolFact[] = [];
  const visit = (node: import("typescript").Node): void => {
    if (ts.isClassDeclaration(node) && node.name) {
      symbols.push({
        name: node.name.text,
        kind: "class",
        exported: hasExportModifier(node),
        span: getSpan(sf, node),
        docstring: extractDocstring(node),
      });
    } else if (ts.isFunctionDeclaration(node) && node.name && isTopLevel(node, sf)) {
      symbols.push({
        name: node.name.text,
        kind: "function",
        exported: hasExportModifier(node),
        span: getSpan(sf, node),
        docstring: extractDocstring(node),
      });
    } else if (ts.isMethodDeclaration(node) && node.name) {
      symbols.push({ name: node.name.getText(sf), kind: "method", exported: false, span: getSpan(sf, node), docstring: extractDocstring(node) });
    } else if (ts.isInterfaceDeclaration(node) && node.name && isTopLevel(node, sf)) {
      symbols.push({
        name: node.name.text,
        kind: "interface",
        exported: hasExportModifier(node),
        span: getSpan(sf, node),
        docstring: extractDocstring(node),
      });
    } else if (ts.isTypeAliasDeclaration(node) && node.name && isTopLevel(node, sf)) {
      symbols.push({
        name: node.name.text,
        kind: "type",
        exported: hasExportModifier(node),
        span: getSpan(sf, node),
        docstring: extractDocstring(node),
      });
    } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && isTopLevel(node, sf)) {
      symbols.push({
        name: node.name.text,
        kind: "variable",
        exported: hasExportModifier(node),
        span: getSpan(sf, node),
        docstring: extractDocstring(node),
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return symbols;
}

function isTopLevel(node: import("typescript").Node, sf: import("typescript").SourceFile): boolean {
  let current = node.parent;
  while (current) {
    if (current === sf) return true;
    if (
      ts.isBlock(current) ||
      ts.isFunctionDeclaration(current) ||
      ts.isClassDeclaration(current) ||
      ts.isMethodDeclaration(current)
    )
      return false;
    current = current.parent;
  }
  return false;
}

function hasExportModifier(node: import("typescript").Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
  );
}

function extractImports(sf: import("typescript").SourceFile): ImportFact[] {
  const imports: ImportFact[] = [];
  const visit = (node: import("typescript").Node): void => {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const imported: string[] = [];
      if (node.importClause) {
        if (node.importClause.name) imported.push(node.importClause.name.text);
        if (node.importClause.namedBindings) {
          if (ts.isNamedImports(node.importClause.namedBindings)) {
            for (const el of node.importClause.namedBindings.elements) {
              imported.push(el.name.text);
            }
          } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
            if (node.importClause.name) imported.push(node.importClause.name.text);
          }
        }
      }
      imports.push({ specifier: node.moduleSpecifier.text, imported, span: getSpan(sf, node) });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return imports;
}

function extractExports(sf: import("typescript").SourceFile): string[] {
  const exports: string[] = [];
  const visit = (node: import("typescript").Node): void => {
    if (ts.isExportDeclaration(node)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const el of node.exportClause.elements) {
          exports.push(el.name.text);
        }
      }
    } else if (ts.isClassDeclaration(node) && node.name && hasExportModifier(node)) {
      exports.push(node.name.text);
    } else if (ts.isFunctionDeclaration(node) && node.name && hasExportModifier(node)) {
      exports.push(node.name.text);
    } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && hasExportModifier(node)) {
      exports.push(node.name.text);
    } else if (ts.isInterfaceDeclaration(node) && node.name && hasExportModifier(node)) {
      exports.push(node.name.text);
    } else if (ts.isTypeAliasDeclaration(node) && node.name && hasExportModifier(node)) {
      exports.push(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return exports;
}

function extractStringArgs(args: readonly import("typescript").Node[]): string[] {
  const out: string[] = [];
  for (const arg of args) {
    if (ts.isStringLiteral(arg)) out.push(arg.text);
    else break;
    if (out.length >= 5) break;
  }
  return out;
}

function extractCalls(sf: import("typescript").SourceFile): CallFact[] {
  const calls: CallFact[] = [];
  const visit = (node: import("typescript").Node, enclosing?: string): void => {
    let childEnclosing = enclosing;

    if (ts.isClassDeclaration(node) && node.name) {
      childEnclosing = node.name.text;
    } else if (ts.isFunctionDeclaration(node) && node.name && enclosing === undefined) {
      childEnclosing = node.name.text;
    }

    if (ts.isCallExpression(node)) {
      const strArgs = extractStringArgs(node.arguments);
      calls.push({
        callee: node.expression.getText(sf),
        enclosing: childEnclosing,
        span: getSpan(sf, node),
        arguments: strArgs.length > 0 ? strArgs : undefined,
      });
    }

    ts.forEachChild(node, (child) => visit(child, childEnclosing));
  };
  visit(sf, undefined);
  return calls;
}

function extractRoutes(sf: import("typescript").SourceFile): RouteFact[] {
  const routes: RouteFact[] = [];
  const visit = (node: import("typescript").Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ["get", "post", "put", "delete", "patch"].includes(node.expression.name.text) &&
      node.arguments.length >= 2 &&
      node.arguments[0] !== undefined &&
      node.arguments[1] !== undefined &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      const verb = node.expression.name.text.toUpperCase();
      const method = verb as RouteFact["method"];
      routes.push({
        method,
        path: (node.arguments[0] as import("typescript").StringLiteral).text,
        handler: node.arguments[1].getText(sf),
        span: getSpan(sf, node),
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return routes;
}

export class JavaScriptAdapter implements LanguageAdapter {
  readonly language = "javascript";
  readonly extensions = [".js", ".jsx", ".mjs", ".cjs"];

  supports(path: string): boolean {
    return this.extensions.some((ext) => path.endsWith(ext));
  }

  parse(path: string, source: string, _ctx: CompilationContext): ParseResult {
    const sf = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
    const artifact: ArtifactIR = {
      id: makeId("art", path),
      kind: "CODE",
      path,
      language: "javascript",
      hash: hash64(sf.getFullText()),
    };
    return {
      artifact,
      symbols: extractSymbols(sf),
      imports: extractImports(sf),
      exports: extractExports(sf),
      calls: extractCalls(sf),
      routes: extractRoutes(sf),
      controlFlows: [],
      source,
    };
  }
}
