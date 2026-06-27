import { ONTOLOGY, ConstraintType, type FeatureDefinition } from "./index.js";

export interface OntologyProblem {
  readonly code: string;
  readonly subject: string;
  readonly message: string;
}

export function validateOntology(): readonly OntologyProblem[] {
  return validateFeatures(ONTOLOGY);
}

export function validateFeatures(features: readonly FeatureDefinition[]): readonly OntologyProblem[] {
  const problems: OntologyProblem[] = [];
  const featureIds = new Set<string>();
  const capabilityIds = new Set<string>();
  const aliases = new Map<string, string>();

  for (const feature of features) {
    if (featureIds.has(feature.id)) {
      problems.push({
        code: "DUPLICATE_FEATURE",
        subject: feature.id,
        message: `Duplicate feature id: ${feature.id}`,
      });
    }
    featureIds.add(feature.id);

    for (const cap of feature.capabilities) {
      if (capabilityIds.has(cap.id)) {
        problems.push({
          code: "DUPLICATE_CAPABILITY",
          subject: cap.id,
          message: `Duplicate capability id: ${cap.id}`,
        });
      }
      capabilityIds.add(cap.id);

      for (const alias of cap.aliases) {
        const lower = alias.toLowerCase();
        const existing = aliases.get(lower);
        if (existing && existing !== cap.id) {
          problems.push({
            code: "DUPLICATE_ALIAS",
            subject: alias,
            message: `Alias "${alias}" already declared for ${existing}`,
          });
        }
        aliases.set(lower, cap.id);
      }

      if (cap.expectedChain.length === 0) {
        problems.push({
          code: "EMPTY_CHAIN",
          subject: cap.id,
          message: `Capability ${cap.id} has empty expectedChain`,
        });
      }

      for (const constraint of cap.constraints) {
        if (constraint.type === ConstraintType.Enum && constraint.enumValues.length === 0) {
          problems.push({
            code: "ENUM_WITHOUT_VALUES",
            subject: `${cap.id}.${constraint.key}`,
            message: `Enum constraint ${constraint.key} has no values`,
          });
        }
        if (constraint.type !== ConstraintType.Enum && constraint.enumValues.length > 0) {
          problems.push({
            code: "NON_ENUM_WITH_VALUES",
            subject: `${cap.id}.${constraint.key}`,
            message: `Non-enum constraint ${constraint.key} has enumValues`,
          });
        }
      }
    }
  }

  return problems;
}
