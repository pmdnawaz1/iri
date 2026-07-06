import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdirSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { compileRepository } from "@rir/compiler";
import { DefaultCoverageEngine } from "@rir/coverage";
import { emptyRequirementSet } from "@rir/ir";
import { ClosureState } from "@rir/ir";
import { writeFileSync } from "node:fs";

const TMP = join(process.cwd(), "test-out-dir-tmp");

function writeArtifacts(outDir: string, ir: ReturnType<typeof Object>, closure: unknown[]) {
  mkdirSync(outDir, { recursive: true });
  const requirements = emptyRequirementSet();
  const coverage = new DefaultCoverageEngine().compute(ir as any, requirements);
  writeFileSync(join(outDir, "repository-ir.json"), JSON.stringify(ir, null, 2));
  writeFileSync(join(outDir, "graph.json"), JSON.stringify({ nodes: (ir as any).nodes, edges: (ir as any).edges }, null, 2));
  writeFileSync(join(outDir, "closure.json"), JSON.stringify(closure, null, 2));
  writeFileSync(join(outDir, "coverage.json"), JSON.stringify(coverage, null, 2));
}

beforeAll(() => {
  mkdirSync(TMP, { recursive: true });
});

afterAll(() => {
  rmSync(TMP, { recursive: true, force: true });
});

describe("rir compile --out-dir", () => {
  it("writes repository-ir.json, graph.json, coverage.json, closure.json to the output directory", async () => {
    const outDir = join(TMP, "express-auth");
    const { ir, closure } = await compileRepository("fixtures/express-auth");
    writeArtifacts(outDir, ir, closure);

    expect(existsSync(join(outDir, "repository-ir.json"))).toBe(true);
    expect(existsSync(join(outDir, "graph.json"))).toBe(true);
    expect(existsSync(join(outDir, "coverage.json"))).toBe(true);
    expect(existsSync(join(outDir, "closure.json"))).toBe(true);

    // repository-ir.json is valid IR
    const irOut = JSON.parse(readFileSync(join(outDir, "repository-ir.json"), "utf8"));
    expect(irOut.version).toBe("1.1.0");
    expect(Array.isArray(irOut.nodes)).toBe(true);
    expect(Array.isArray(irOut.edges)).toBe(true);
    expect(Array.isArray(irOut.capabilities)).toBe(true);

    // graph.json has nodes and edges
    const graph = JSON.parse(readFileSync(join(outDir, "graph.json"), "utf8"));
    expect(Array.isArray(graph.nodes)).toBe(true);
    expect(Array.isArray(graph.edges)).toBe(true);

    // coverage.json has coverage ratios
    const coverage = JSON.parse(readFileSync(join(outDir, "coverage.json"), "utf8"));
    expect(coverage.requirement).toBeDefined();
    expect(coverage.implementation).toBeDefined();
    expect(coverage.documentation).toBeDefined();
    expect(coverage.test).toBeDefined();
    expect(coverage.capability).toBeDefined();
    expect(typeof coverage.implementation.ratio).toBe("number");

    // closure.json is an array of closure results
    const closureOut = JSON.parse(readFileSync(join(outDir, "closure.json"), "utf8"));
    expect(Array.isArray(closureOut)).toBe(true);
    for (const c of closureOut) {
      expect(c.capabilityId).toBeDefined();
      expect(c.state).toBeDefined();
      expect(Array.isArray(c.missing)).toBe(true);
    }
  });

  it("writes consistency.json when --docs is used", async () => {
    const outDir = join(TMP, "with-docs");
    const { compileWithDocuments } = await import("@rir/compiler");
    const { ir, closure, requirements, findings, guardFindings } = await compileWithDocuments(
      "fixtures/fullstack-auth",
      "fixtures/fullstack-auth-docs",
    );
    mkdirSync(outDir, { recursive: true });
    const coverage = new DefaultCoverageEngine().compute(ir, requirements);
    writeFileSync(join(outDir, "repository-ir.json"), JSON.stringify(ir, null, 2));
    writeFileSync(join(outDir, "graph.json"), JSON.stringify({ nodes: ir.nodes, edges: ir.edges }, null, 2));
    writeFileSync(join(outDir, "closure.json"), JSON.stringify(closure, null, 2));
    writeFileSync(join(outDir, "coverage.json"), JSON.stringify(coverage, null, 2));
    writeFileSync(join(outDir, "consistency.json"), JSON.stringify({ findings, guardFindings }, null, 2));

    expect(existsSync(join(outDir, "repository-ir.json"))).toBe(true);
    expect(existsSync(join(outDir, "consistency.json"))).toBe(true);

    const consistency = JSON.parse(readFileSync(join(outDir, "consistency.json"), "utf8"));
    expect(Array.isArray(consistency.findings)).toBe(true);
    expect(Array.isArray(consistency.guardFindings)).toBe(true);
  });
});
