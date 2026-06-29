import { createRequire } from "node:module";
import type { LanguageAdapter, ParseResult, SymbolFact, ImportFact, CallFact, RouteFact } from "../index.js";
import type { CompilationContext } from "@rir/core";
import type { ArtifactIR, Span } from "@rir/ir";
import { makeId, hash64 } from "@rir/common";

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
      });
    } else if (ts.isFunctionDeclaration(node) && node.name && isTopLevel(node, sf)) {
      symbols.push({
        name: node.name.text,
        kind: "function",
        exported: hasExportModifier(node),
        span: getSpan(sf, node),
      });
    } else if (ts.isMethodDeclaration(node) && node.name) {
      symbols.push({ name: node.name.getText(sf), kind: "method", exported: false, span: getSpan(sf, node) });
    } else if (ts.isInterfaceDeclaration(node) && node.name && isTopLevel(node, sf)) {
      symbols.push({
        name: node.name.text,
        kind: "interface",
        exported: hasExportModifier(node),
        span: getSpan(sf, node),
      });
    } else if (ts.isTypeAliasDeclaration(node) && node.name && isTopLevel(node, sf)) {
      symbols.push({
        name: node.name.text,
        kind: "type",
        exported: hasExportModifier(node),
        span: getSpan(sf, node),
      });
    } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && isTopLevel(node, sf)) {
      symbols.push({
        name: node.name.text,
        kind: "variable",
        exported: hasExportModifier(node),
        span: getSpan(sf, node),
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
          } else if (ts.isNamespaceImport(node.importClause.namedBindings) && node.importClause.name) {
            imported.push(node.importClause.name.text);
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
      calls.push({
        callee: node.expression.getText(sf),
        enclosing: childEnclosing,
        span: getSpan(sf, node),
      });
    }

    ts.forEachChild(node, (child) => visit(child, childEnclosing));
  };
  visit(sf, undefined);
  return calls;
}

type TsNode = import("typescript").Node;
type TsSourceFile = import("typescript").SourceFile;

// TSPEC-A021: NestJS method decorators and file-based (route.ts) export verbs.
const HTTP_VERB_DECORATORS = new Set(["Get", "Post", "Put", "Patch", "Delete", "Options", "Head", "All"]);
const HTTP_VERB_EXPORTS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]);
const ROUTING_ROOT_MARKERS = new Set(["api", "routes", "app", "pages", "handlers"]);

function decoratorsOf(node: TsNode): readonly import("typescript").Decorator[] {
  return ts.canHaveDecorators(node) ? (ts.getDecorators(node) ?? []) : [];
}

/** The decorator's identifier name and its first string-literal argument (or ""). */
function decoratorNameAndArg(
  dec: import("typescript").Decorator,
): { name: string; path: string } | undefined {
  const expr = dec.expression;
  if (ts.isCallExpression(expr) && ts.isIdentifier(expr.expression)) {
    const arg = expr.arguments[0];
    return { name: expr.expression.text, path: arg && ts.isStringLiteral(arg) ? arg.text : "" };
  }
  if (ts.isIdentifier(expr)) return { name: expr.text, path: "" };
  return undefined;
}

function joinRoutePath(base: string, sub: string): string {
  const joined = [base.replace(/\/+$/, ""), sub.replace(/^\/+/, "")].filter(Boolean).join("/");
  return "/" + joined.replace(/^\/+/, "");
}

/** NestJS-style: an `@Controller('base')` class whose methods carry `@Get(':id')` etc. */
function extractDecoratorRoutes(sf: TsSourceFile): RouteFact[] {
  const routes: RouteFact[] = [];
  const visit = (node: TsNode): void => {
    if (ts.isClassDeclaration(node)) {
      let base: string | undefined;
      for (const dec of decoratorsOf(node)) {
        const info = decoratorNameAndArg(dec);
        if (info?.name === "Controller") base = info.path;
      }
      if (base !== undefined) {
        const className = node.name?.text ?? "Controller";
        for (const member of node.members) {
          if (!ts.isMethodDeclaration(member) || !member.name) continue;
          for (const dec of decoratorsOf(member)) {
            const info = decoratorNameAndArg(dec);
            if (!info || !HTTP_VERB_DECORATORS.has(info.name)) continue;
            routes.push({
              method: info.name === "All" ? "ALL" : info.name.toUpperCase(),
              path: joinRoutePath(base, info.path),
              handler: `${className}.${member.name.getText(sf)}`,
              span: getSpan(sf, member),
            });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return routes;
}

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

/** File-based routing: a `route.ts`/`route.js` that exports `GET`/`POST`/... functions. */
function extractFileBasedRoutes(sf: TsSourceFile, path: string): RouteFact[] {
  const norm = path.replace(/\\/g, "/");
  const file = norm.slice(norm.lastIndexOf("/") + 1);
  if (!/^route\.(t|j)sx?$/.test(file)) return [];
  const routePath = fileBasedPath(norm.slice(0, norm.lastIndexOf("/")));

  const routes: RouteFact[] = [];
  const add = (name: string, node: TsNode): void => {
    if (HTTP_VERB_EXPORTS.has(name))
      routes.push({ method: name, path: routePath, handler: name, span: getSpan(sf, node) });
  };
  for (const stmt of sf.statements) {
    const exported =
      ts.canHaveModifiers(stmt) && ts.getModifiers(stmt)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!exported) continue;
    if (ts.isFunctionDeclaration(stmt) && stmt.name) add(stmt.name.text, stmt);
    else if (ts.isVariableStatement(stmt)) {
      for (const d of stmt.declarationList.declarations) if (ts.isIdentifier(d.name)) add(d.name.text, stmt);
    }
  }
  return routes;
}

function extractRoutes(sf: TsSourceFile, path: string): RouteFact[] {
  const routes: RouteFact[] = [];
  const visit = (node: TsNode): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ["get", "post", "put", "delete", "patch"].includes(node.expression.name.text) &&
      node.arguments.length >= 2
    ) {
      const first = node.arguments[0];
      const second = node.arguments[1];
      if (first !== undefined && second !== undefined && ts.isStringLiteral(first)) {
        routes.push({
          method: node.expression.name.text.toUpperCase(),
          path: first.text,
          handler: second.getText(sf),
          span: getSpan(sf, node),
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return [...routes, ...extractDecoratorRoutes(sf), ...extractFileBasedRoutes(sf, path)];
}

export function extractParseResult(sf: import("typescript").SourceFile, path: string): ParseResult {
  const artifact: ArtifactIR = {
    id: makeId("art", path),
    kind: "CODE",
    path,
    language: "typescript",
    hash: hash64(sf.getFullText()),
  };
  return {
    artifact,
    symbols: extractSymbols(sf),
    imports: extractImports(sf),
    exports: extractExports(sf),
    calls: extractCalls(sf),
    routes: extractRoutes(sf, path),
  };
}

export class TypeScriptAdapter implements LanguageAdapter {
  readonly language = "typescript";
  readonly extensions = [".ts", ".tsx"];

  supports(path: string): boolean {
    return this.extensions.some((ext) => path.endsWith(ext));
  }

  parse(path: string, source: string, _ctx: CompilationContext): ParseResult {
    const sf = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
    return extractParseResult(sf, path);
  }
}
