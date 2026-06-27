/**
 * @rir/compiler-api — REST API.
 *
 * Route wiring only (no business decisions). Endpoints accept a Repository IR and
 * delegate to the deterministic engines. The compile endpoints are wired but return
 * 501 until the builder pipeline is assembled. Schemas use Zod for request validation.
 */

import Fastify from "fastify";
import { z } from "zod";
import { DefaultClosureEngine } from "@rir/closure";
import { DefaultCoverageEngine } from "@rir/coverage";
import { DefaultConsistencyEngine } from "@rir/consistency";
import { QueryEngine } from "@rir/query-engine";
import { emptyRequirementSet, type RepositoryIR } from "@rir/ir";
import { Worker, CompileRepository } from "@rir/worker";
import * as fs from "fs";

const irBody = z.object({ ir: z.unknown() });

function parseIR(body: unknown): RepositoryIR {
  const { ir } = irBody.parse(body);
  return ir as RepositoryIR;
}

export function buildServer() {
  const app = Fastify({ logger: true });

  app.post("/closure", async (req) => {
    const ir = parseIR(req.body);
    return { results: new DefaultClosureEngine().evaluate(ir) };
  });

  app.post("/coverage", async (req) => {
    const ir = parseIR(req.body);
    return { report: new DefaultCoverageEngine().compute(ir, emptyRequirementSet()) };
  });

  app.post("/consistency", async (req) => {
    const ir = parseIR(req.body);
    return { findings: new DefaultConsistencyEngine().check(ir) };
  });

  app.post("/query", async (req) => {
    const schema = z.object({ ir: z.unknown(), capability: z.string() });
    const { ir, capability } = schema.parse(req.body);
    const engine = new QueryEngine(ir as RepositoryIR);
    return { subgraph: engine.capabilitySubgraph(capability) };
  });

  app.post("/compile/repository", async (req, reply) => {
    const schema = z.object({ dir: z.string() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "bad request" };
    }
    const dir = parsed.data.dir;
    if (!fs.existsSync(dir)) {
      reply.code(400);
      return { error: "bad request" };
    }

    // Instead of a global queue for now, we instantiate a local worker and dispatch.
    // The dispatch runs in the background (we don't await it to return 202 immediately).
    const worker = new Worker().register(new CompileRepository(dir));
    worker.dispatch("CompileRepository").catch((err) => {
      app.log.error(err, "background job failed");
    });

    reply.code(202);
    return { status: "queued", dir };
  });

  for (const route of ["/compile/code", "/compile/document", "/diff", "/graph", "/snapshot"]) {
    app.post(route, async (_req, reply) => {
      reply.code(501);
      return { error: "builder pipeline not yet assembled", route };
    });
  }

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 3000);
  buildServer()
    .listen({ port, host: "0.0.0.0" })
    .catch((err) => {
      process.stderr.write(`failed to start: ${String(err)}\n`);
      process.exit(1);
    });
}
