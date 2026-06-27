/**
 * EOS Project Compiler — state machine.
 *
 * The only legal lifecycle transitions. Any transition not listed here is invalid
 * and must be rejected by the validator. This encodes the happy path plus the single
 * failure loop (ARCHITECT_REVIEW -> CHANGES_REQUESTED -> IMPLEMENTING).
 */

import { State } from "./types.js";

/** Adjacency: state -> states it may legally transition to. */
export const TRANSITIONS: Readonly<Record<State, readonly State[]>> = {
  [State.Draft]: [State.ArchitectureReview],
  [State.ArchitectureReview]: [State.ReadyForImplementation, State.ChangesRequested],
  [State.ReadyForImplementation]: [State.Implementing],
  [State.Implementing]: [State.CodeComplete],
  [State.CodeComplete]: [State.TestsComplete],
  [State.TestsComplete]: [State.ReviewPending],
  [State.ReviewPending]: [State.ArchitectReview],
  [State.ArchitectReview]: [State.Approved, State.ChangesRequested],
  [State.ChangesRequested]: [State.Implementing],
  [State.Approved]: [State.MergedToMain],
  [State.MergedToMain]: [State.GraphRecompiled],
  [State.GraphRecompiled]: [State.DependenciesUpdated],
  [State.DependenciesUpdated]: [State.NextTspecsUnlocked],
  [State.NextTspecsUnlocked]: [State.Complete],
  [State.Complete]: [],
};

/** Validate a single transition. */
export function isLegalTransition(from: State, to: State): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Terminal state. */
export function isTerminal(state: State): boolean {
  return TRANSITIONS[state].length === 0;
}

/** The canonical happy-path ordering, for documentation and progress metrics. */
export const HAPPY_PATH: readonly State[] = [
  State.Draft,
  State.ArchitectureReview,
  State.ReadyForImplementation,
  State.Implementing,
  State.CodeComplete,
  State.TestsComplete,
  State.ReviewPending,
  State.ArchitectReview,
  State.Approved,
  State.MergedToMain,
  State.GraphRecompiled,
  State.DependenciesUpdated,
  State.NextTspecsUnlocked,
  State.Complete,
];
