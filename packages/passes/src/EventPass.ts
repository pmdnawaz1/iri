import { AbstractPass } from "./base.js";
import type { CompilationContext, IRDraft } from "@rir/core";
import type { NodeIR } from "@rir/ir";
import { makeId } from "@rir/common";

const EMIT_METHODS = new Set(["emit", "publish", "dispatch"]);
const CONSUME_METHODS = new Set(["on", "subscribe", "addlistener", "handle"]);

export class EventPass extends AbstractPass {
  readonly name = "EventPass";

  async run(ctx: CompilationContext, draft: IRDraft): Promise<void> {
    const eventsByName = new Map<string, NodeIR[]>();
    const consumersByName = new Map<string, NodeIR[]>();

    for (const pr of ctx.parseResults ?? []) {
      for (const call of pr.calls) {
        const segments = call.callee.split(".");
        const method = segments[segments.length - 1]?.toLowerCase();

        if (!method) continue;
        if (!call.enclosing) continue;

        const eventName = call.arguments?.[0];

        if (EMIT_METHODS.has(method)) {
          const eventId = makeId("event", pr.artifact.path, String(call.span.startLine));
          const node: NodeIR = {
            id: eventId,
            kind: "EVENT",
            name: eventName ?? method,
            language: pr.artifact.language,
            artifactId: pr.artifact.id,
            span: call.span,
            hash: "0",
            filePath: pr.artifact.path,
            execution: { reachable: false, entryDistance: null, runtimeObserved: false, tested: false },
            evidence: [{ source: "AST", locator: pr.artifact.path, confidence: 1 }],
          };
          draft.addNode(node);

          if (eventName) {
            const list = eventsByName.get(eventName) ?? [];
            list.push(node);
            eventsByName.set(eventName, list);
          }

          const fromId = makeId("decl", call.enclosing);
          if (draft.getNode(fromId)) {
            draft.addEdge({
              id: makeId("edge", "emits", fromId, eventId),
              kind: "EMITS",
              from: fromId,
              to: eventId,
              evidence: [{ source: "AST", locator: pr.artifact.path, confidence: 1 }],
            });
          }
        } else if (CONSUME_METHODS.has(method)) {
          const consumerId = makeId("consumer", pr.artifact.path, String(call.span.startLine));
          const node: NodeIR = {
            id: consumerId,
            kind: "EVENT_CONSUMER",
            name: eventName ?? method,
            language: pr.artifact.language,
            artifactId: pr.artifact.id,
            span: call.span,
            hash: "0",
            filePath: pr.artifact.path,
            execution: { reachable: false, entryDistance: null, runtimeObserved: false, tested: false },
            evidence: [{ source: "AST", locator: pr.artifact.path, confidence: 1 }],
          };
          draft.addNode(node);

          if (eventName) {
            const list = consumersByName.get(eventName) ?? [];
            list.push(node);
            consumersByName.set(eventName, list);
          }

          const fromId = makeId("decl", call.enclosing);
          if (draft.getNode(fromId)) {
            draft.addEdge({
              id: makeId("edge", "consumes", fromId, consumerId),
              kind: "CONSUMES",
              from: fromId,
              to: consumerId,
              evidence: [{ source: "AST", locator: pr.artifact.path, confidence: 1 }],
            });
          }
        }
      }
    }

    for (const [name, consumers] of consumersByName) {
      const events = eventsByName.get(name);
      if (!events) continue;
      for (const consumer of consumers) {
        for (const event of events) {
          draft.addEdge({
            id: makeId("edge", "event_link", consumer.id, event.id),
            kind: "CONSUMES",
            from: consumer.id,
            to: event.id,
            evidence: [{ source: "AST", locator: name, confidence: 0.8 }],
          });
        }
      }
    }
  }
}
