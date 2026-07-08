import { AbstractPass } from "./base.js";
import type { CompilationContext, IRDraft } from "@rir/core";
import { makeId } from "@rir/common";

const SQL_METHODS = new Set([
  "query",
  "execute",
  "exec",
  "raw",
  "insert",
  "update",
  "delete",
  "find",
  "findone",
  "save",
  // SQLAlchemy ORM session methods
  "execute_statement",
  "add",
  "add_all",
  "commit",
  "rollback",
  "flush",
  "merge",
  "get",
  "refresh",
  "expunge",
  "bulk_save_objects",
  "bulk_insert_mappings",
  "bulk_update_mappings",
  // SQLAlchemy query chain methods (produce SQL when terminal)
  "filter",
  "filter_by",
  "where",
  "order_by",
  "group_by",
  "having",
  "limit",
  "offset",
  "join",
  "outerjoin",
  "subquery",
  "all",
  "first",
  "one",
  "one_or_none",
  "count",
  "exists",
  "scalar",
  "distinct",
  "union",
  "union_all",
  // Pydantic / SQLModel
  "from_query",
  "from_attributes",
]);

const WRITES_METHODS = new Set([
  "insert",
  "update",
  "delete",
  "save",
  "exec",
  "execute",
  "execute_statement",
  "add",
  "add_all",
  "commit",
  "flush",
  "merge",
  "bulk_save_objects",
  "bulk_insert_mappings",
  "bulk_update_mappings",
]);

const QUERY_CHAIN_METHODS = new Set([
  "filter",
  "filter_by",
  "where",
  "order_by",
  "group_by",
  "having",
  "limit",
  "offset",
  "join",
  "outerjoin",
  "subquery",
  "distinct",
  "union",
  "union_all",
]);

export class SQLPass extends AbstractPass {
  readonly name = "SQLPass";

  async run(ctx: CompilationContext, draft: IRDraft): Promise<void> {
    for (const pr of ctx.parseResults ?? []) {
      for (const call of pr.calls) {
        const segments = call.callee.split(".");
        const method = segments[segments.length - 1]?.toLowerCase();

        if (method && SQL_METHODS.has(method)) {
          const sqlId = makeId("sql", pr.artifact.path, String(call.span.startLine));

          // Query chain methods (.filter(), .where(), etc.) don't execute SQL themselves
          // — they're intermediate query builders. Skip them entirely; only terminal
          // methods (.all(), .first(), .execute()) below produce SQL_QUERY nodes.
          if (method && QUERY_CHAIN_METHODS.has(method)) {
            continue;
          }

          draft.addNode({
            id: sqlId,
            kind: "SQL_QUERY",
            name: method,
            language: pr.artifact.language,
            artifactId: pr.artifact.id,
            span: call.span,
            hash: "0",
            filePath: pr.artifact.path,
            execution: { reachable: false, entryDistance: null, runtimeObserved: false, tested: false },
            evidence: [{ source: "AST", locator: pr.artifact.path, confidence: 1 }],
          });

          if (call.enclosing) {
            const fromId = makeId("decl", call.enclosing);
            if (draft.getNode(fromId)) {
              const edgeKind = WRITES_METHODS.has(method) ? "WRITES" : "READS";
              const edgeId = makeId("edge", "sql", fromId, sqlId);

              draft.addEdge({
                id: edgeId,
                kind: edgeKind,
                from: fromId,
                to: sqlId,
                evidence: [{ source: "AST", locator: pr.artifact.path, confidence: 1 }],
              });
            }
          }
        }
      }
    }
  }
}
