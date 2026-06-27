import { type FeatureDefinition } from "./index.js";
export interface OntologyProblem {
    readonly code: string;
    readonly subject: string;
    readonly message: string;
}
export declare function validateOntology(): readonly OntologyProblem[];
export declare function validateFeatures(features: readonly FeatureDefinition[]): readonly OntologyProblem[];
//# sourceMappingURL=validators.d.ts.map