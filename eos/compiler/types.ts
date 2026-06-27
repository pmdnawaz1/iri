/**
 * EOS Project Compiler — type system (the TSPEC contract).
 *
 * These types ARE the schema. A TSPEC has no optional fields: the architectural
 * dataset supplies the intrinsic fields; the compiler derives the rest. Roles are
 * repository roles, never model names.
 */

export const Role = {
  Architect: "ROLE_ARCHITECT",
  Implementer: "ROLE_IMPLEMENTER",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

/** Legal project state machine states (linear happy path + failure path). */
export const State = {
  Draft: "DRAFT",
  ArchitectureReview: "ARCHITECTURE_REVIEW",
  ReadyForImplementation: "READY_FOR_IMPLEMENTATION",
  Implementing: "IMPLEMENTING",
  CodeComplete: "CODE_COMPLETE",
  TestsComplete: "TESTS_COMPLETE",
  ReviewPending: "REVIEW_PENDING",
  ArchitectReview: "ARCHITECT_REVIEW",
  ChangesRequested: "CHANGES_REQUESTED",
  Approved: "APPROVED",
  MergedToMain: "MERGED_TO_MAIN",
  GraphRecompiled: "GRAPH_RECOMPILED",
  DependenciesUpdated: "DEPENDENCIES_UPDATED",
  NextTspecsUnlocked: "NEXT_TSPECS_UNLOCKED",
  Complete: "COMPLETE",
} as const;
export type State = (typeof State)[keyof typeof State];

export const Priority = { P0: "P0", P1: "P1", P2: "P2", P3: "P3" } as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export const Complexity = { Low: "LOW", Medium: "MEDIUM", High: "HIGH" } as const;
export type Complexity = (typeof Complexity)[keyof typeof Complexity];

export const Risk = { Low: "LOW", Medium: "MEDIUM", High: "HIGH" } as const;
export type Risk = (typeof Risk)[keyof typeof Risk];

/** The intrinsic, architect-authored part of a TSPEC (source of truth). */
export interface TspecSource {
  readonly id: string;
  readonly title: string;
  readonly owner: Role;
  readonly package: string;
  readonly module: string;
  readonly priority: Priority;
  readonly complexity: Complexity;
  readonly risk: Risk;
  /** Effort in story points; also weights the critical path. */
  readonly estimated_effort: number;
  readonly depends_on: readonly string[];
  readonly references: readonly string[];
  readonly architecture_documents: readonly string[];
  readonly deliverables: readonly string[];
  readonly outputs: readonly string[];
  readonly tests: readonly string[];
  readonly acceptance_criteria: readonly string[];
  readonly forbidden_changes: readonly string[];
  readonly labels: readonly string[];
}

/** The fully-compiled TSPEC: source + all derived fields. No optional fields. */
export interface Tspec extends TspecSource {
  readonly state: State;
  readonly repository_path: string;
  readonly branch: string;
  readonly parent_branch: string;
  readonly blocks: readonly string[];
  readonly reviewers: readonly Role[];
  readonly version: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly wave: number;
  readonly critical_path: boolean;
  readonly parallel_group: string;
  /** Path to the architect-authored work order (eos/specs/<id>.spec.md). */
  readonly spec_path: string;
  /** Implementer TSPECs require a work order before READY_FOR_IMPLEMENTATION. */
  readonly spec_required: boolean;
  readonly spec_status: "WRITTEN" | "MISSING";
}

/** Repository-wide compile constants (deterministic). */
export const EOS = {
  parentBranch: "main",
  version: "1.0.0",
  createdAt: "2026-06-27T00:00:00Z",
  updatedAt: "2026-06-27T00:00:00Z",
  coverageTarget: 0.95,
} as const;
