# ADR-0015 — Telemetry Evidence Model

Status: Accepted · Owner: ROLE_ARCHITECT · TSPEC: TSPEC-A015

## Context
Runtime observations must enter the IR as first-class evidence, not as a side channel.

## Decision
`@rir/telemetry` maps a `RuntimeTrace` to `EvidenceIR` (`source: RUNTIME`): observed
execution (count > 0) → confidence 1; mere registration → 0.5. `DefaultTelemetryIngestor`
groups evidence by node id deterministically.

## Invariants
1. Telemetry normalizes observations only; it never writes the IR directly.
2. The RuntimePass attaches the produced evidence to nodes.
3. Confidence is deterministic from the trace.

## Consequences
Runtime evidence raises `runtimeObserved`/confidence; it never creates capabilities.
