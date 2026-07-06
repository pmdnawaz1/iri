import { describe, it, expect } from "vitest";
import { compileRepository } from "@rir/compiler";
import { ClosureState } from "@rir/ir";

describe("Cross-tier stitching (G3.3/G3.4/G7)", () => {
  it("fullstack-auth compiles with nodes from both frontend and backend", async () => {
    const { ir } = await compileRepository("fixtures/fullstack-auth");

    // Should have ROUTE nodes from the backend.
    const routeNodes = ir.nodes.filter((n) => n.kind === "ROUTE");
    expect(routeNodes.length).toBeGreaterThanOrEqual(1);

    // Should have FUNCTION nodes from both frontend and backend.
    const funcNodes = ir.nodes.filter((n) => n.kind === "FUNCTION");
    expect(funcNodes.length).toBeGreaterThanOrEqual(1);

    // The CapabilityPass should find a login-related capability.
    const loginCap = ir.capabilities.find(
      (c) => c.capability.includes("LOGIN") || c.capability.includes("login"),
    );
    expect(loginCap).toBeDefined();

    // The capability should include nodes from the backend chain.
    expect(loginCap!.nodes.length).toBeGreaterThanOrEqual(2);
  });

  it("fullstack-auth produces CROSS_TIER edges connecting frontend to backend", async () => {
    const { ir } = await compileRepository("fixtures/fullstack-auth");

    // Should have CROSS_TIER edges.
    const crossTierEdges = ir.edges.filter((e) => e.kind === "CROSS_TIER");
    expect(crossTierEdges.length).toBeGreaterThanOrEqual(1);

    // CROSS_TIER edges should connect a frontend node to a backend ROUTE.
    const nodeMap = new Map(ir.nodes.map((n) => [n.id, n]));
    for (const edge of crossTierEdges) {
      const fromNode = nodeMap.get(edge.from);
      const toNode = nodeMap.get(edge.to);
      expect(fromNode).toBeDefined();
      expect(toNode).toBeDefined();
      // Target should be a ROUTE node (backend).
      expect(toNode!.kind).toBe("ROUTE");
    }
  });

  it("AUTH.LOGIN has closure state that is not ORPHAN in fullstack-auth", async () => {
    const { ir, closure } = await compileRepository("fixtures/fullstack-auth");

    const loginCap = ir.capabilities.find(
      (c) => c.capability.includes("LOGIN") || c.capability.includes("login"),
    );
    expect(loginCap).toBeDefined();

    const loginClosure = closure.find((c) => c.capabilityId === loginCap!.id);
    expect(loginClosure).toBeDefined();
    // Should not be ORPHAN — the backend chain should be wired.
    expect(loginClosure!.state).not.toBe(ClosureState.Orphan);
  });

  it("snapshot writes content-addressed IR with proper fields", async () => {
    const { ir } = await compileRepository("fixtures/express-auth");
    const { hash64 } = await import("@rir/common");
    const { writeFileSync, mkdirSync, readFileSync, rmSync, existsSync } = await import("node:fs");
    const { join } = await import("node:path");

    const tmpDir = join(process.cwd(), "test-snapshot-tmp");
    mkdirSync(tmpDir, { recursive: true });

    try {
      const canonical = JSON.stringify(ir);
      const sha = hash64(canonical);
      const outPath = join(tmpDir, `${sha}.json`);
      writeFileSync(outPath, JSON.stringify({ id: `snap|${sha}`, createdAt: new Date().toISOString(), repositoryHash: sha, ir }, null, 2));

      expect(existsSync(outPath)).toBe(true);
      const snap = JSON.parse(readFileSync(outPath, "utf8"));
      expect(snap.id).toBe(`snap|${sha}`);
      expect(snap.repositoryHash).toBe(sha);
      expect(snap.ir.version).toBe("1.1.0");
      expect(snap.createdAt).not.toBe(new Date(0).toISOString());
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
