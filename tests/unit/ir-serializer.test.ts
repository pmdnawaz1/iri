import { describe, it, expect } from "vitest";
import { serializeRepositoryIR, parseRepositoryIR, validateRepositoryIR } from "@rir/ir";
import { emptyRepositoryIR } from "@rir/ir";
import { InvariantError } from "@rir/common";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const brokenFixture = JSON.parse(
  readFileSync(join(process.cwd(), "fixtures/broken-repository/repository-ir.json"), "utf8"),
);

describe("serializeRepositoryIR", () => {
  it("serializes empty IR deterministically", () => {
    const s1 = serializeRepositoryIR(emptyRepositoryIR());
    const s2 = serializeRepositoryIR(emptyRepositoryIR());
    expect(s1).toBe(s2);
  });

  it("produces stable key order", () => {
    const ir = emptyRepositoryIR();
    const s = serializeRepositoryIR(ir);
    expect(s.indexOf('"artifacts"')).toBeLessThan(s.indexOf('"version"'));
  });

  it("equal IRs produce identical strings", () => {
    const ir1 = emptyRepositoryIR();
    const ir2 = emptyRepositoryIR();
    expect(serializeRepositoryIR(ir1)).toBe(serializeRepositoryIR(ir2));
  });
});

describe("parseRepositoryIR", () => {
  it("round-trips empty IR", () => {
    const ir = emptyRepositoryIR();
    const parsed = parseRepositoryIR(serializeRepositoryIR(ir));
    expect(parsed).deep.equal(ir);
  });

  it("round-trips broken-repository fixture", () => {
    const parsed = parseRepositoryIR(serializeRepositoryIR(brokenFixture));
    expect(parsed).deep.equal(brokenFixture);
  });
});

describe("validateRepositoryIR", () => {
  it("passes for valid fixture", () => {
    expect(() => validateRepositoryIR(brokenFixture)).not.toThrow();
  });

  it("throws InvariantError for invalid version", () => {
    expect(() =>
      validateRepositoryIR({ version: "0.0.0", nodes: [], edges: [], artifacts: [], capabilities: [] }),
    ).toThrow(InvariantError);
  });

  it("throws for unknown node kind", () => {
    const ir = {
      version: "1.0.0",
      nodes: [
        {
          id: "n1",
          kind: "UNKNOWN_KIND",
          name: "x",
          language: null,
          artifactId: "a1",
          span: null,
          hash: "0",
          execution: { reachable: false, entryDistance: null, runtimeObserved: false, tested: false },
          evidence: [{ source: "AST", locator: "test", confidence: 1 }],
        },
      ],
      edges: [],
      artifacts: [],
      capabilities: [],
    };
    expect(() => validateRepositoryIR(ir)).toThrow(InvariantError);
  });

  it("throws for dangling edge reference", () => {
    const ir = {
      version: "1.0.0",
      nodes: [
        {
          id: "n1",
          kind: "MODULE",
          name: "x",
          language: null,
          artifactId: "a1",
          span: null,
          hash: "0",
          execution: { reachable: false, entryDistance: null, runtimeObserved: false, tested: false },
          evidence: [{ source: "AST", locator: "test", confidence: 1 }],
        },
      ],
      edges: [
        {
          id: "e1",
          kind: "CALLS",
          from: "n1",
          to: "MISSING",
          evidence: [{ source: "AST", locator: "test", confidence: 1 }],
        },
      ],
      artifacts: [],
      capabilities: [],
    };
    expect(() => validateRepositoryIR(ir)).toThrow(InvariantError);
  });

  it("throws for non-object input", () => {
    expect(() => validateRepositoryIR("not an object")).toThrow(InvariantError);
  });
});
