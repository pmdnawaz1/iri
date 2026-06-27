import { describe, it, expect } from "vitest";
import { validateOntology, validateFeatures } from "@rir/ontology";
import { ONTOLOGY, ConstraintType, ExecutionStage } from "@rir/ontology";
import type { FeatureDefinition } from "@rir/ontology";

describe("validateOntology", () => {
  it("returns empty array for shipped ontology", () => {
    const problems = validateOntology();
    expect(problems).toEqual([]);
  });

  it("output is deterministic", () => {
    const p1 = validateOntology();
    const p2 = validateOntology();
    expect(p1).toEqual(p2);
  });
});

describe("validateFeatures", () => {
  it("detects duplicate capability id", () => {
    const features: FeatureDefinition[] = [
      {
        id: "F1", name: "Feature 1",
        capabilities: [
          { id: "F1.CAP", name: "CAP", expectedChain: [ExecutionStage.Handler], constraints: [], outputs: [], aliases: [] },
        ],
      },
      {
        id: "F2", name: "Feature 2",
        capabilities: [
          { id: "F1.CAP", name: "CAP", expectedChain: [ExecutionStage.Handler], constraints: [], outputs: [], aliases: [] },
        ],
      },
    ];
    const problems = validateFeatures(features);
    expect(problems.some(p => p.code === "DUPLICATE_CAPABILITY")).toBe(true);
  });

  it("detects duplicate alias", () => {
    const features: FeatureDefinition[] = [
      {
        id: "F1", name: "Feature 1",
        capabilities: [
          { id: "F1.A", name: "A", expectedChain: [ExecutionStage.Handler], constraints: [], outputs: [], aliases: ["signin"] },
          { id: "F1.B", name: "B", expectedChain: [ExecutionStage.Handler], constraints: [], outputs: [], aliases: ["SignIn"] },
        ],
      },
    ];
    const problems = validateFeatures(features);
    expect(problems.some(p => p.code === "DUPLICATE_ALIAS")).toBe(true);
  });

  it("detects ENUM constraint with no values", () => {
    const features: FeatureDefinition[] = [
      {
        id: "F1", name: "Feature 1",
        capabilities: [
          {
            id: "F1.CAP", name: "CAP", expectedChain: [ExecutionStage.Handler],
            constraints: [{ key: "K", type: ConstraintType.Enum, enumValues: [], required: true }],
            outputs: [], aliases: [],
          },
        ],
      },
    ];
    const problems = validateFeatures(features);
    expect(problems.some(p => p.code === "ENUM_WITHOUT_VALUES")).toBe(true);
  });

  it("detects empty expected chain", () => {
    const features: FeatureDefinition[] = [
      {
        id: "F1", name: "Feature 1",
        capabilities: [
          { id: "F1.CAP", name: "CAP", expectedChain: [], constraints: [], outputs: [], aliases: [] },
        ],
      },
    ];
    const problems = validateFeatures(features);
    expect(problems.some(p => p.code === "EMPTY_CHAIN")).toBe(true);
  });

  it("returns no problems for valid single feature", () => {
    const features: FeatureDefinition[] = [
      {
        id: "F1", name: "Feature 1",
        capabilities: [
          { id: "F1.CAP", name: "CAP", expectedChain: [ExecutionStage.Handler], constraints: [], outputs: [], aliases: [] },
        ],
      },
    ];
    expect(validateFeatures(features)).toEqual([]);
  });
});
