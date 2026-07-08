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

function extractNodeDecorators(
  node: import("typescript").Node,
): { name: string; args: string[] }[] | undefined {
  if (!ts.canHaveDecorators(node)) return undefined;
  const decs = ts.getDecorators(node);
  if (!decs || decs.length === 0) return undefined;
  return decs
    .map((dec) => {
      const expr = dec.expression;
      if (ts.isCallExpression(expr) && ts.isIdentifier(expr.expression)) {
        const args: string[] = [];
        for (const arg of expr.arguments) {
          if (ts.isStringLiteral(arg)) args.push(arg.text);
        }
        return { name: expr.expression.text, args };
      }
      if (ts.isIdentifier(expr)) return { name: expr.text, args: [] };
      return null;
    })
    .filter((d): d is { name: string; args: string[] } => d !== null);
}

export function extractDocstring(node: import("typescript").Node): string | undefined {
  let target = node;
  if (
    ts.isVariableDeclaration(node) &&
    node.parent &&
    node.parent.parent &&
    ts.isVariableStatement(node.parent.parent)
  ) {
    target = node.parent.parent;
  }
  const jsDocs = (target as any).jsDoc;
  if (Array.isArray(jsDocs) && jsDocs.length > 0) {
    const doc = jsDocs[jsDocs.length - 1];
    if (typeof doc.comment === "string") return doc.comment;
    if (Array.isArray(doc.comment)) return doc.comment.map((c: any) => c.text).join("");
  }
  return undefined;
}

function extractHeritage(
  node: import("typescript").ClassDeclaration | import("typescript").InterfaceDeclaration,
  sf: import("typescript").SourceFile,
): { extendsList?: string[]; implementsList?: string[] } {
  let extendsList: string[] | undefined;
  let implementsList: string[] | undefined;
  if (node.heritageClauses) {
    for (const clause of node.heritageClauses) {
      const types = clause.types.map((t) => t.expression.getText(sf));
      if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
        extendsList = types;
      } else if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
        implementsList = types;
      }
    }
  }
  return { extendsList, implementsList };
}

function extractSymbols(sf: import("typescript").SourceFile): SymbolFact[] {
  const symbols: SymbolFact[] = [];
  const visit = (node: import("typescript").Node, enclosing?: string): void => {
    let childEnclosing = enclosing;

    if (ts.isClassDeclaration(node) && node.name) {
      childEnclosing = enclosing ? `${enclosing}::${node.name.text}` : node.name.text;
      const heritage = extractHeritage(node, sf);
      symbols.push({
        name: node.name.text,
        kind: "class",
        exported: hasModifier(node, ts.SyntaxKind.ExportKeyword),
        span: getSpan(sf, node),
        visibility: getVisibility(node),
        isAbstract: hasModifier(node, ts.SyntaxKind.AbstractKeyword),
        isStatic: hasModifier(node, ts.SyntaxKind.StaticKeyword),
        typeParameters: getTypeParameters(node, sf),
        qualifiedName: childEnclosing,
        decorators: extractNodeDecorators(node),
        docstring: extractDocstring(node),
        extends: heritage.extendsList,
        implements: heritage.implementsList,
      });
    } else if (ts.isFunctionDeclaration(node) && node.name && isTopLevel(node, sf)) {
      const qName = enclosing ? `${enclosing}::${node.name.text}` : node.name.text;
      symbols.push({
        name: node.name.text,
        kind: "function",
        exported: hasModifier(node, ts.SyntaxKind.ExportKeyword),
        span: getSpan(sf, node),
        isAsync: hasModifier(node, ts.SyntaxKind.AsyncKeyword),
        signature: getSignature(node, sf),
        returnType: getReturnType(node, sf),
        typeParameters: getTypeParameters(node, sf),
        qualifiedName: qName,
        decorators: extractNodeDecorators(node),
        docstring: extractDocstring(node),
      });
    } else if (ts.isPropertyDeclaration(node) && node.name) {
      const nameText = node.name.getText(sf);
      const qName = enclosing ? `${enclosing}::${nameText}` : nameText;
      symbols.push({
        name: nameText,
        kind: "property",
        exported: false,
        span: getSpan(sf, node),
        visibility: getVisibility(node),
        isStatic: hasModifier(node, ts.SyntaxKind.StaticKeyword),
        returnType: node.type ? node.type.getText(sf) : undefined,
        qualifiedName: qName,
        decorators: extractNodeDecorators(node),
        docstring: extractDocstring(node),
      });
    } else if (ts.isMethodDeclaration(node) && node.name) {
      const nameText = node.name.getText(sf);
      const qName = enclosing ? `${enclosing}::${nameText}` : nameText;
      const methodDecs = extractNodeDecorators(node) ?? [];
      const paramDecs = node.parameters.flatMap((p) => extractNodeDecorators(p) ?? []);
      const allDecs = [...methodDecs, ...paramDecs];

      symbols.push({
        name: nameText,
        kind: "method",
        exported: false,
        span: getSpan(sf, node),
        visibility: getVisibility(node),
        isAsync: hasModifier(node, ts.SyntaxKind.AsyncKeyword),
        isStatic: hasModifier(node, ts.SyntaxKind.StaticKeyword),
        isAbstract: hasModifier(node, ts.SyntaxKind.AbstractKeyword),
        signature: getSignature(node, sf),
        returnType: getReturnType(node, sf),
        typeParameters: getTypeParameters(node, sf),
        qualifiedName: qName,
        decorators: allDecs.length > 0 ? allDecs : undefined,
        docstring: extractDocstring(node),
      });
    } else if (ts.isInterfaceDeclaration(node) && node.name && isTopLevel(node, sf)) {
      const qName = enclosing ? `${enclosing}::${node.name.text}` : node.name.text;
      const heritage = extractHeritage(node, sf);
      symbols.push({
        name: node.name.text,
        kind: "interface",
        exported: hasModifier(node, ts.SyntaxKind.ExportKeyword),
        span: getSpan(sf, node),
        typeParameters: getTypeParameters(node, sf),
        qualifiedName: qName,
        docstring: extractDocstring(node),
        extends: heritage.extendsList,
        implements: heritage.implementsList,
      });
    } else if (ts.isTypeAliasDeclaration(node) && node.name && isTopLevel(node, sf)) {
      const qName = enclosing ? `${enclosing}::${node.name.text}` : node.name.text;
      symbols.push({
        name: node.name.text,
        kind: "type_alias",
        exported: hasModifier(node, ts.SyntaxKind.ExportKeyword),
        span: getSpan(sf, node),
        typeParameters: getTypeParameters(node, sf),
        qualifiedName: qName,
        docstring: extractDocstring(node),
      });
    } else if (ts.isEnumDeclaration(node) && node.name && isTopLevel(node, sf)) {
      const qName = enclosing ? `${enclosing}::${node.name.text}` : node.name.text;
      symbols.push({
        name: node.name.text,
        kind: "enum",
        exported: hasModifier(node, ts.SyntaxKind.ExportKeyword),
        span: getSpan(sf, node),
        qualifiedName: qName,
        docstring: extractDocstring(node),
      });
    } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && isTopLevel(node, sf)) {
      const qName = enclosing ? `${enclosing}::${node.name.text}` : node.name.text;
      const isConst =
        node.parent &&
        ts.isVariableDeclarationList(node.parent) &&
        (node.parent.flags & ts.NodeFlags.Const) !== 0;
      symbols.push({
        name: node.name.text,
        kind: isConst ? "constant" : "variable",
        exported: hasExportModifier(node),
        span: getSpan(sf, node),
        qualifiedName: qName,
      });
    } else if (ts.isPropertyDeclaration(node) && ts.isIdentifier(node.name)) {
      const qName = enclosing ? `${enclosing}::${node.name.text}` : node.name.text;
      symbols.push({
        name: node.name.text,
        kind: "field",
        exported: false,
        span: getSpan(sf, node),
        visibility: getVisibility(node),
        isStatic: hasModifier(node, ts.SyntaxKind.StaticKeyword),
        qualifiedName: qName,
        docstring: extractDocstring(node),
        decorators: extractNodeDecorators(node),
      });
    } else if (
      ts.isParameter(node) &&
      ts.isIdentifier(node.name) &&
      node.parent &&
      ts.isConstructorDeclaration(node.parent) &&
      (hasModifier(node, ts.SyntaxKind.PrivateKeyword) ||
        hasModifier(node, ts.SyntaxKind.ProtectedKeyword) ||
        hasModifier(node, ts.SyntaxKind.PublicKeyword) ||
        hasModifier(node, ts.SyntaxKind.ReadonlyKeyword))
    ) {
      const qName = enclosing ? `${enclosing}::${node.name.text}` : node.name.text;
      symbols.push({
        name: node.name.text,
        kind: "field",
        exported: false,
        span: getSpan(sf, node),
        visibility:
          getVisibility(node) ?? (hasModifier(node, ts.SyntaxKind.ReadonlyKeyword) ? "public" : undefined),
        qualifiedName: qName,
        decorators: extractNodeDecorators(node),
      });
    } else if (ts.isEnumMember(node) && ts.isIdentifier(node.name)) {
      const qName = enclosing ? `${enclosing}::${node.name.text}` : node.name.text;
      symbols.push({
        name: node.name.text,
        kind: "enum_member",
        exported: false,
        span: getSpan(sf, node),
        qualifiedName: qName,
        docstring: extractDocstring(node),
      });
    } else if (ts.isImportSpecifier(node)) {
      symbols.push({
        name: node.name.text,
        kind: "import",
        exported: false,
        span: getSpan(sf, node),
        qualifiedName: node.name.text,
      });
    } else if (ts.isImportClause(node) && node.name) {
      symbols.push({
        name: node.name.text,
        kind: "import",
        exported: false,
        span: getSpan(sf, node),
        qualifiedName: node.name.text,
      });
    }
    ts.forEachChild(node, (child) => visit(child, childEnclosing));
  };
  visit(sf, undefined);
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

function hasModifier(node: import("typescript").Node, kind: import("typescript").SyntaxKind): boolean {
  return ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((m) => m.kind === kind);
}

function hasExportModifier(node: import("typescript").Node): boolean {
  return hasModifier(node, ts.SyntaxKind.ExportKeyword);
}

function getVisibility(node: import("typescript").Node): "public" | "private" | "protected" | undefined {
  if (hasModifier(node, ts.SyntaxKind.PrivateKeyword)) return "private";
  if (hasModifier(node, ts.SyntaxKind.ProtectedKeyword)) return "protected";
  if (hasModifier(node, ts.SyntaxKind.PublicKeyword)) return "public";
  return undefined;
}

function getSignature(
  node: import("typescript").Node,
  sf: import("typescript").SourceFile,
): string | undefined {
  if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
    const params = node.parameters.map((p) => p.getText(sf)).join(", ");
    const ret = node.type ? `: ${node.type.getText(sf)}` : "";
    return `(${params})${ret}`;
  }
  return undefined;
}

function getReturnType(
  node: import("typescript").Node,
  sf: import("typescript").SourceFile,
): string | undefined {
  if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && node.type) {
    return node.type.getText(sf);
  }
  return undefined;
}

function getTypeParameters(
  node: import("typescript").Node,
  sf: import("typescript").SourceFile,
): string[] | undefined {
  if (
    (ts.isFunctionDeclaration(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node)) &&
    node.typeParameters &&
    node.typeParameters.length > 0
  ) {
    return node.typeParameters.map((p) => p.getText(sf));
  }
  return undefined;
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

function extractStringArgs(args: readonly TsNode[] | undefined): string[] {
  if (!args) return [];
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
    } else if (ts.isNewExpression(node)) {
      const strArgs = extractStringArgs(node.arguments);
      calls.push({
        callee: node.expression.getText(sf),
        enclosing: childEnclosing,
        span: getSpan(sf, node),
        isNew: true,
        arguments: strArgs.length > 0 ? strArgs : undefined,
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
              method: (info.name === "All" ? "ALL" : info.name.toUpperCase()) as RouteFact["method"],
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
      routes.push({
        method: name as RouteFact["method"],
        path: routePath,
        handler: name,
        span: getSpan(sf, node),
      });
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
          method: node.expression.name.text.toUpperCase() as RouteFact["method"],
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

function extractControlFlows(sf: import("typescript").SourceFile): import("@rir/core").ControlFlowFact[] {
  const flows: import("@rir/core").ControlFlowFact[] = [];
  const visit = (node: import("typescript").Node, enclosing?: string): void => {
    let childEnclosing = enclosing;
    if (ts.isClassDeclaration(node) && node.name) {
      childEnclosing = enclosing ? `${enclosing}::${node.name.text}` : node.name.text;
    } else if (ts.isMethodDeclaration(node) && node.name) {
      const nameText = node.name.getText(sf);
      childEnclosing = enclosing ? `${enclosing}::${nameText}` : nameText;
    } else if (ts.isFunctionDeclaration(node) && node.name) {
      childEnclosing = enclosing ? `${enclosing}::${node.name.text}` : node.name.text;
    } else if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
    ) {
      childEnclosing = enclosing ? `${enclosing}::${node.name.text}` : node.name.text;
    }

    if (ts.isThrowStatement(node)) {
      let typeName: string | undefined;
      if (
        node.expression &&
        ts.isNewExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression)
      ) {
        typeName = node.expression.expression.text;
      }
      flows.push({ kind: "THROW", enclosing: childEnclosing, typeName, span: getSpan(sf, node) });
    } else if (ts.isCatchClause(node)) {
      let typeName: string | undefined;
      if (
        node.variableDeclaration &&
        node.variableDeclaration.type &&
        ts.isTypeReferenceNode(node.variableDeclaration.type) &&
        ts.isIdentifier(node.variableDeclaration.type.typeName)
      ) {
        typeName = node.variableDeclaration.type.typeName.text;
      }
      flows.push({ kind: "CATCH", enclosing: childEnclosing, typeName, span: getSpan(sf, node) });
    }
    ts.forEachChild(node, (c) => visit(c, childEnclosing));
  };
  visit(sf, undefined);
  return flows;
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
    controlFlows: extractControlFlows(sf),
    source: sf.getFullText(),
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
