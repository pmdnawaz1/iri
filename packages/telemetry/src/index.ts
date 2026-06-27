/**
 * @rir/telemetry — Optional runtime evidence ingestion.
 *
 * Ingests runtime traces / coverage imports and projects them into Evidence that
 * passes (RuntimePass) attach to nodes. This package only normalizes external
 * observations into the canonical EvidenceIR shape; it never writes IR directly.
 */

import { EvidenceSource, type EvidenceIR } from "@rir/ir";

/** A single observed runtime span (e.g. from OpenTelemetry). */
export interface RuntimeTrace {
  /** Canonical node id the span maps to (resolved by the caller). */
  readonly nodeId: string;
  /** Trace/span identifier, used as evidence locator. */
  readonly traceId: string;
  /** Number of observed invocations; 0 means observed-but-not-executed. */
  readonly count: number;
}

/** Normalize a runtime trace into canonical evidence for a node. */
export function traceToEvidence(trace: RuntimeTrace): EvidenceIR {
  return {
    source: EvidenceSource.Runtime,
    locator: trace.traceId,
    // Observed execution is high-confidence; mere registration is lower.
    confidence: trace.count > 0 ? 1 : 0.5,
  };
}

/** Contract for ingesting a batch of runtime traces. */
export interface TelemetryIngestor {
  ingest(traces: readonly RuntimeTrace[]): ReadonlyMap<string, EvidenceIR[]>;
}

/** Reference ingestor: groups evidence by node id deterministically. */
export class DefaultTelemetryIngestor implements TelemetryIngestor {
  ingest(traces: readonly RuntimeTrace[]): ReadonlyMap<string, EvidenceIR[]> {
    const byNode = new Map<string, EvidenceIR[]>();
    for (const trace of traces) {
      const list = byNode.get(trace.nodeId) ?? [];
      list.push(traceToEvidence(trace));
      byNode.set(trace.nodeId, list);
    }
    return byNode;
  }
}
