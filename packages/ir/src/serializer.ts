import { type RepositoryIR } from "./index.js";
import { validateRepositoryIR } from "./validator.js";

export function serializeRepositoryIR(ir: RepositoryIR): string {
  return JSON.stringify(ir, stableReplacer(), 2);
}

function stableReplacer(): (this: unknown, key: string, value: unknown) => unknown {
  return function (_key, value) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(value).sort()) {
        sorted[k] = (value as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return value;
  };
}

export function parseRepositoryIR(json: string): RepositoryIR {
  const parsed = JSON.parse(json) as unknown;
  validateRepositoryIR(parsed);
  return parsed as RepositoryIR;
}
