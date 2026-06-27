/**
 * @rir/common — Shared, dependency-light utilities.
 *
 * Deterministic helpers only: logging, typed errors, stable hashing, and id
 * construction. Nothing here interprets meaning or mutates the IR.
 */

// --- Errors ---------------------------------------------------------------

/** Base class for all RIR errors; carries a stable machine-readable code. */
export class RirError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** Raised when an implementer would have to make an architectural decision. */
export class EscalationError extends RirError {
  constructor(message: string) {
    super(message, "ESCALATE");
  }
}

/** Raised when an invariant of the IR or ontology is violated. */
export class InvariantError extends RirError {
  constructor(message: string) {
    super(message, "INVARIANT");
  }
}

// --- Logger ---------------------------------------------------------------

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(msg: string, fields?: Record<string, unknown>): void;
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  error(msg: string, fields?: Record<string, unknown>): void;
  child(fields: Record<string, unknown>): Logger;
}

const LEVEL_RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/** Minimal deterministic JSON-line logger. Output never influences compiler results. */
export class ConsoleLogger implements Logger {
  constructor(
    private readonly level: LogLevel = "info",
    private readonly base: Record<string, unknown> = {},
  ) {}

  private log(level: LogLevel, msg: string, fields?: Record<string, unknown>): void {
    if (LEVEL_RANK[level] < LEVEL_RANK[this.level]) return;
    const line = JSON.stringify({ level, msg, ...this.base, ...fields });
    if (level === "error" || level === "warn") process.stderr.write(line + "\n");
    else process.stdout.write(line + "\n");
  }

  debug(msg: string, fields?: Record<string, unknown>): void {
    this.log("debug", msg, fields);
  }
  info(msg: string, fields?: Record<string, unknown>): void {
    this.log("info", msg, fields);
  }
  warn(msg: string, fields?: Record<string, unknown>): void {
    this.log("warn", msg, fields);
  }
  error(msg: string, fields?: Record<string, unknown>): void {
    this.log("error", msg, fields);
  }
  child(fields: Record<string, unknown>): Logger {
    return new ConsoleLogger(this.level, { ...this.base, ...fields });
  }
}

// --- Hashing & ids --------------------------------------------------------

/**
 * Stable, dependency-free 64-bit FNV-1a hash rendered as 16 hex chars. Used for
 * content addressing (artifact hashes, node hashes). Deterministic across runs.
 */
export function hash64(input: string): string {
  let hi = 0x811c;
  let lo = 0x9dc5;
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    lo ^= code & 0xff;
    // 32-bit-safe FNV mixing across two 16-bit halves.
    const tmpLo = (lo * 0x01000193) >>> 0;
    const tmpHi = ((hi * 0x01000193) + Math.floor((lo * 0x0193) / 0x10000)) >>> 0;
    lo = tmpLo & 0xffff;
    hi = tmpHi & 0xffff;
  }
  return (hi.toString(16).padStart(4, "0") + lo.toString(16).padStart(4, "0")).padStart(16, "0");
}

/** Build a canonical, collision-resistant id from ordered parts. */
export function makeId(...parts: readonly string[]): string {
  return parts.map((p) => p.replace(/[|]/g, "_")).join("|");
}
