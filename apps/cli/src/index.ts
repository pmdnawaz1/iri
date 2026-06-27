#!/usr/bin/env node
/**
 * @rir/cli — Developer CLI.
 *
 * Thin, deterministic dispatch over the compiler packages. Commands that depend on
 * the full builder pipeline (compile/diff/query/graph/snapshot) are wired but report
 * that the pipeline is not yet assembled; the analysis commands (validate, ontology,
 * coverage) run against a Repository IR loaded from JSON and are fully functional.
 */

import { readFile } from "node:fs/promises";
import { openSync, writeSync } from "node:fs";
import { Buffer } from "node:buffer";
import { ConsoleLogger } from "@rir/common";
import { ClosureState, RIR_VERSION, type RepositoryIR } from "@rir/ir";
import { ONTOLOGY_VERSION, allCapabilities } from "@rir/ontology";
import { DefaultClosureEngine } from "@rir/closure";
import { DefaultCoverageEngine } from "@rir/coverage";
import { emptyRequirementSet } from "@rir/ir";
import { compileRepository, compileWithDocuments } from "@rir/compiler";
import { prove } from "./prove.js";

const log = new ConsoleLogger("info");

const USAGE = `rir — Repository Intermediate Representation

Usage:
  rir version                 Print component versions
  rir ontology                List canonical ontology capabilities
  rir validate <ir.json>      Run closure over a Repository IR (JSON)
  rir coverage <ir.json>      Run coverage over a Repository IR (JSON)
  rir prove <dir>             Parse a TS backend dir and report AUTH.LOGIN closure (legacy slice)
  rir compile <dir>           Compile a repo (adapters -> passes -> IR -> closure)
  rir compile <dir> --docs <d>  Also compile docs and report doc<->code consistency
  rir diff <a> <b>            (pipeline not yet assembled)
  rir query <capability>      (pipeline not yet assembled)
  rir graph                   (pipeline not yet assembled)
  rir snapshot                (pipeline not yet assembled)

Global options:
  --log <file>                Append all output (stdout + stderr) to <file> as well
`;

async function loadIR(path: string | undefined): Promise<RepositoryIR> {
  if (!path) throw new Error("expected a path to a Repository IR JSON file");
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as RepositoryIR;
}

/** Tee stdout + stderr to a file (append), so output is both shown and logged.
 *  Uses synchronous writes so data is flushed before process.exit(). */
function teeToFile(file: string): void {
  const fd = openSync(file, "a");
  for (const s of [process.stdout, process.stderr]) {
    const original = s.write.bind(s) as (...args: unknown[]) => boolean;
    s.write = ((chunk: Uint8Array | string, ...args: unknown[]) => {
      try {
        if (typeof chunk === "string") {
          writeSync(fd, chunk);
        } else {
          writeSync(fd, Buffer.from(chunk));
        }
      } catch {
        // best-effort logging; never let a log write break the command
      }
      return original(chunk, ...args);
    }) as typeof s.write;
  }
}

/** Extract `--log <file>` from argv (if present) and start file logging. */
function applyLogOption(argv: readonly string[]): string[] {
  const i = argv.indexOf("--log");
  if (i === -1) return [...argv];
  const file = argv[i + 1];
  if (file) teeToFile(file);
  return [...argv.slice(0, i), ...argv.slice(i + 2)];
}

async function main(rawArgv: readonly string[]): Promise<number> {
  const argv = applyLogOption(rawArgv);
  const [command, ...rest] = argv;

  switch (command) {
    case "version": {
      process.stdout.write(`rir cli\nRIR ${RIR_VERSION}\nontology ${ONTOLOGY_VERSION}\n`);
      return 0;
    }
    case "ontology": {
      for (const cap of allCapabilities()) {
        process.stdout.write(
          `${cap.id}\t(${cap.expectedChain.length} stages, ${cap.constraints.length} constraints)\n`,
        );
      }
      return 0;
    }
    case "validate": {
      const ir = await loadIR(rest[0]);
      const results = new DefaultClosureEngine().evaluate(ir);
      for (const r of results) {
        const missing = r.missing.length ? ` missing=[${r.missing.join(",")}]` : "";
        process.stdout.write(`${r.capabilityId}\t${r.state}${missing}\n`);
      }
      return results.every((r) => r.state === "CLOSED") ? 0 : 1;
    }
    case "coverage": {
      const ir = await loadIR(rest[0]);
      const report = new DefaultCoverageEngine().compute(ir, emptyRequirementSet());
      for (const [dim, ratio] of Object.entries(report)) {
        process.stdout.write(
          `${dim}\t${(ratio.ratio * 100).toFixed(1)}%\t(${ratio.covered}/${ratio.total})\n`,
        );
      }
      return 0;
    }
    case "prove": {
      const dir = rest[0];
      if (!dir) {
        process.stderr.write("usage: rir prove <dir>\n");
        return 64;
      }
      const { directory, fileCount, ir, result, reachableChain } = prove(dir);
      process.stdout.write(`Repository: ${directory}\n`);
      process.stdout.write(
        `Parsed ${fileCount} file(s) -> ${ir.nodes.length} nodes, ${ir.edges.length} edges\n`,
      );
      process.stdout.write(`\nAUTH.LOGIN: ${result.state}\n`);
      process.stdout.write(`  reachable chain: ${reachableChain.join(" -> ") || "(none)"}\n`);
      process.stdout.write(`  present stages:  ${result.present.join(", ") || "(none)"}\n`);
      process.stdout.write(`  missing stages:  ${result.missing.join(", ") || "(none)"}\n`);
      return result.state === ClosureState.Closed ? 0 : 1;
    }
    case "compile": {
      const positionals = rest.filter(
        (a, i) => !a.startsWith("--") && rest[i - 1] !== "--docs" && rest[i - 1] !== "--log",
      );
      const dir = positionals[0];
      if (!dir) {
        process.stderr.write("usage: rir compile <dir> [--docs <dir>] [--json]\n");
        return 64;
      }

      const docsIdx = rest.indexOf("--docs");
      const docsDir = docsIdx === -1 ? undefined : rest[docsIdx + 1];
      if (docsDir) {
        const { ir, closure, requirements, findings } = await compileWithDocuments(dir, docsDir);
        if (rest.includes("--json")) {
          process.stdout.write(
            JSON.stringify({ dir, docsDir, ir, closure, requirements, findings }, null, 2) + "\n",
          );
          return findings.some((f) => f.severity === "ERROR") ? 1 : 0;
        }
        process.stdout.write(
          `Compiled ${dir} + docs ${docsDir}: ${ir.capabilities.length} code capabilities, ${requirements.requirements.length} documented\n`,
        );
        if (findings.length === 0) {
          process.stdout.write("  doc<->code consistency: OK (no findings)\n");
        } else {
          for (const f of findings) {
            process.stdout.write(`  [${f.severity}] ${f.code}\t${f.capability}\t${f.message}\n`);
          }
        }
        return findings.some((f) => f.severity === "ERROR") ? 1 : 0;
      }

      const { ir, closure } = await compileRepository(dir);
      if (rest.includes("--json")) {
        // Full IR + closure for downstream analysis (e.g. ontology self-evolution).
        const routes = ir.nodes.filter((n) => n.kind === "ROUTE").map((n) => n.name);
        const mapped = new Set(ir.capabilities.map((c) => c.capability));
        process.stdout.write(
          JSON.stringify({ dir, ir, closure, routes, mappedCapabilities: [...mapped] }, null, 2) + "\n",
        );
        return 0;
      }
      process.stdout.write(
        `Compiled ${dir}: ${ir.nodes.length} nodes, ${ir.edges.length} edges, ${ir.capabilities.length} capabilities\n`,
      );
      for (const cap of ir.capabilities) {
        const r = closure.find((c) => c.capabilityId === cap.id);
        process.stdout.write(`  ${cap.capability}\t${r?.state ?? "?"}\n`);
      }
      return closure.every((c) => c.state === ClosureState.Closed) ? 0 : 1;
    }
    case "diff":
    case "query":
    case "graph":
    case "snapshot": {
      log.warn("command requires the builder pipeline, which is not yet assembled", { command });
      return 2;
    }
    case undefined:
    case "help":
    case "--help":
    case "-h": {
      process.stdout.write(USAGE);
      return 0;
    }
    default: {
      process.stderr.write(`unknown command: ${command}\n\n${USAGE}`);
      return 64;
    }
  }
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    log.error("cli failed", { error: err instanceof Error ? err.message : String(err) });
    process.exit(70);
  });
