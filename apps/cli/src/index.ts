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
import { ConsoleLogger } from "@rir/common";
import { ClosureState, RIR_VERSION, type RepositoryIR } from "@rir/ir";
import { ONTOLOGY_VERSION, allCapabilities } from "@rir/ontology";
import { DefaultClosureEngine } from "@rir/closure";
import { DefaultCoverageEngine } from "@rir/coverage";
import { emptyRequirementSet } from "@rir/ir";
import { prove } from "./prove.js";

const log = new ConsoleLogger("info");

const USAGE = `rir — Repository Intermediate Representation

Usage:
  rir version                 Print component versions
  rir ontology                List canonical ontology capabilities
  rir validate <ir.json>      Run closure over a Repository IR (JSON)
  rir coverage <ir.json>      Run coverage over a Repository IR (JSON)
  rir prove <dir>             Parse a TS backend dir and report AUTH.LOGIN closure
  rir compile <path>          (pipeline not yet assembled)
  rir diff <a> <b>            (pipeline not yet assembled)
  rir query <capability>      (pipeline not yet assembled)
  rir graph                   (pipeline not yet assembled)
  rir snapshot                (pipeline not yet assembled)
`;

async function loadIR(path: string | undefined): Promise<RepositoryIR> {
  if (!path) throw new Error("expected a path to a Repository IR JSON file");
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as RepositoryIR;
}

async function main(argv: readonly string[]): Promise<number> {
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
    case "compile":
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
