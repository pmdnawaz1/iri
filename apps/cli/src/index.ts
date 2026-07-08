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
import { mkdirSync, openSync, writeSync, writeFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import { join as joinPath } from "node:path";
import { ConsoleLogger, hash64 } from "@rir/common";
import { ClosureState, RIR_VERSION, type RepositoryIR } from "@rir/ir";
import { ONTOLOGY_VERSION, allCapabilities } from "@rir/ontology";
import { DefaultClosureEngine } from "@rir/closure";
import { DefaultCoverageEngine } from "@rir/coverage";
import { emptyRequirementSet } from "@rir/ir";
import { compileRepository, compileWithDocuments, diffClosures, suggestDocumentAliases } from "@rir/compiler";
import { GuardClosureEngine } from "@rir/consistency";
import type { ClosureResult } from "@rir/closure";
import { prove } from "./prove.js";

const log = new ConsoleLogger("info");

const USAGE = `rir — Repository Intermediate Representation

Usage:
  rir version                 Print component versions
  rir ontology                List canonical ontology capabilities
  rir validate <ir.json>      Run closure over a Repository IR (JSON)
  rir coverage <ir.json>      Run coverage over a Repository IR (JSON)
  rir prove <dir>             Compile a dir and report closure for all capabilities
  rir check <dir>             Compile, validate closure, and check guards (CI gate)
  rir compile <dir>           Compile a repo (adapters -> passes -> IR -> closure)
  rir compile <dir> --docs <d>  Also compile docs and report doc<->code consistency
  rir compile <dir> --out-dir <d>  Write separate artifact files to <d>/
  rir suggest-aliases <docs>  BM25-rank ontology for UNMAPPED doc statements (proposal-only)
  rir diff <a.json> <b.json>  Closure drift between two compile --json runs (CI-gateable)
  rir query <cap> <ir.json>   Show a capability's chain, constraints, and closure
  rir graph <ir.json>         Emit a Mermaid flowchart of the IR (--capability <id> to scope)
  rir snapshot <ir.json> [--out-dir <dir>]  Write a content-addressed snapshot file to snapshots/{sha}.json

Global options:
  --log <file>                Append all output (stdout + stderr) to <file> as well
`;

async function loadIR(path: string | undefined): Promise<RepositoryIR> {
  if (!path) throw new Error("expected a path to a Repository IR JSON file");
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as RepositoryIR;
}

/** Load a `rir compile --json` object (or a bare IR) into { ir, closure }. */
async function loadCompile(path: string): Promise<{ ir: RepositoryIR; closure: ClosureResult[] }> {
  const obj = JSON.parse(await readFile(path, "utf8")) as
    | RepositoryIR
    | { ir: RepositoryIR; closure?: ClosureResult[] };
  if ("nodes" in obj && "capabilities" in obj) return { ir: obj, closure: [] };
  return { ir: obj.ir, closure: obj.closure ?? [] };
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
        const missingConstraints = r.missingConstraints.length ? ` missingConstraints=[${r.missingConstraints.join(",")}]` : "";
        process.stdout.write(`${r.capabilityId}\t${r.state}${missing}${missingConstraints}\n`);
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
      const { directory, fileCount, ir, results, reachableChain } = await prove(dir);
      process.stdout.write(`Repository: ${directory}\n`);
      process.stdout.write(
        `Parsed ${fileCount} file(s) -> ${ir.nodes.length} nodes, ${ir.edges.length} edges\n`,
      );
      for (const r of results) {
        if (r.state === ClosureState.Orphan) continue;
        const missing = r.missing.length ? ` missing=[${r.missing.join(",")}]` : "";
        const missingConstraints = r.missingConstraints.length ? ` missingConstraints=[${r.missingConstraints.join(",")}]` : "";
        process.stdout.write(`\n${r.capabilityId}: ${r.state}${missing}${missingConstraints}\n`);
      }
      process.stdout.write(`\n  reachable chain: ${reachableChain.join(" -> ") || "(none)"}\n`);
      const best = results.find((r) => r.state === ClosureState.Closed);
      return best ? 0 : 1;
    }
    case "check": {
      const dir = rest[0];
      if (!dir) {
        process.stderr.write("usage: rir check <dir>\n");
        return 64;
      }
      const { ir, closure } = await compileRepository(dir);
      const guardFindings = new GuardClosureEngine().check(ir);

      let failed = 0;
      for (const r of closure) {
        if (r.state === ClosureState.Orphan || r.state === ClosureState.Conflicting) continue;
        const mc = r.missingConstraints.length > 0 ? ` +${r.missingConstraints.length} missing constraints` : "";
        process.stdout.write(`${r.state}\t${r.capabilityId}${mc}\n`);
        if (r.state !== ClosureState.Closed) failed++;
      }
      for (const f of guardFindings) {
        process.stdout.write(`${f.severity}\t${f.code}\t${f.capability}\t${f.message}\n`);
        failed++;
      }
      if (failed === 0) process.stdout.write("All capabilities CLOSED, no guard findings.\n");
      return failed > 0 ? 1 : 0;
    }
    case "suggest-aliases": {
      const docsDir = rest.find((a) => !a.startsWith("--"));
      if (!docsDir) {
        process.stderr.write("usage: rir suggest-aliases <docsDir> [--min <score>] [--top <k>] [--json]\n");
        return 64;
      }
      const minIdx = rest.indexOf("--min");
      const topIdx = rest.indexOf("--top");
      const minScore = minIdx === -1 ? undefined : Number(rest[minIdx + 1]);
      const top = topIdx === -1 ? undefined : Number(rest[topIdx + 1]);
      const suggestions = suggestDocumentAliases(docsDir, { minScore, top });

      if (rest.includes("--json")) {
        process.stdout.write(JSON.stringify({ docsDir, suggestions }, null, 2) + "\n");
        return 0;
      }
      if (suggestions.length === 0) {
        process.stdout.write("No UNMAPPED requirement-like statements found.\n");
        return 0;
      }
      process.stdout.write(
        `${suggestions.length} UNMAPPED statement(s) — BM25 candidates (proposal-only, edit nothing):\n`,
      );
      for (const s of suggestions) {
        process.stdout.write(`\n  "${s.statement}"  (${s.locator})\n`);
        if (s.candidates.length === 0) {
          process.stdout.write("    (no capability above threshold — likely a NEW capability)\n");
          continue;
        }
        for (const c of s.candidates) {
          process.stdout.write(
            `    -> ${c.capability}\t(bm25 ${c.score}, matched: ${c.matched.join(" ")})\n`,
          );
        }
      }
      return 0;
    }
    case "compile": {
      const positionals = rest.filter(
        (a, i) => !a.startsWith("--") && rest[i - 1] !== "--docs" && rest[i - 1] !== "--log" && rest[i - 1] !== "--out-dir",
      );
      const dir = positionals[0];
      if (!dir) {
        process.stderr.write("usage: rir compile <dir> [--docs <dir>] [--json] [--out-dir <dir>]\n");
        return 64;
      }

      const docsIdx = rest.indexOf("--docs");
      const docsDir = docsIdx === -1 ? undefined : rest[docsIdx + 1];
      const outDirIdx = rest.indexOf("--out-dir");
      const outDir = outDirIdx === -1 ? undefined : rest[outDirIdx + 1];

      if (docsDir) {
        const { ir, closure, requirements, findings, guardFindings, scope } = await compileWithDocuments(
          dir,
          docsDir,
        );
        const failed = [...findings, ...guardFindings].some((f) => f.severity === "ERROR");

        if (outDir) {
          mkdirSync(outDir, { recursive: true });
          const coverage = new DefaultCoverageEngine().compute(ir, requirements);
          writeFileSync(joinPath(outDir, "repository-ir.json"), JSON.stringify(ir, null, 2));
          writeFileSync(joinPath(outDir, "graph.json"), JSON.stringify({ nodes: ir.nodes, edges: ir.edges }, null, 2));
          writeFileSync(joinPath(outDir, "closure.json"), JSON.stringify(closure, null, 2));
          writeFileSync(joinPath(outDir, "coverage.json"), JSON.stringify(coverage, null, 2));
          writeFileSync(joinPath(outDir, "consistency.json"), JSON.stringify({ findings, guardFindings }, null, 2));
          process.stdout.write(
            `Wrote 5 artifact files to ${outDir}/ (${ir.capabilities.length} capabilities, ${closure.filter((c) => c.state === "CLOSED").length} closed)\n`,
          );
          return failed ? 1 : 0;
        }

        if (rest.includes("--json")) {
          process.stdout.write(
            JSON.stringify(
              { dir, docsDir, scope, ir, closure, requirements, findings, guardFindings },
              null,
              2,
            ) + "\n",
          );
          return failed ? 1 : 0;
        }
        process.stdout.write(
          `Compiled ${dir} + docs ${docsDir}: ${ir.capabilities.length} code capabilities, ${requirements.requirements.length} documented${scope ? " (scoped)" : ""}\n`,
        );
        const all = [...findings, ...guardFindings];
        if (all.length === 0) {
          process.stdout.write("  doc<->code consistency + guard closure: OK (no findings)\n");
        } else {
          // Criticality first (CRITICAL→LOW), then ERROR before WARNING.
          const critRank: Record<string, number> = { CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
          for (const f of [...all].sort(
            (a, b) =>
              critRank[a.criticality]! - critRank[b.criticality]! ||
              (a.severity === b.severity ? 0 : a.severity === "ERROR" ? -1 : 1),
          )) {
            process.stdout.write(
              `  [${f.severity}/${f.criticality}] ${f.code}\t${f.capability}\t${f.message}\n`,
            );
          }
        }
        return failed ? 1 : 0;
      }

      const { ir, closure } = await compileRepository(dir);

      if (outDir) {
        mkdirSync(outDir, { recursive: true });
        const requirements = emptyRequirementSet();
        const coverage = new DefaultCoverageEngine().compute(ir, requirements);
        writeFileSync(joinPath(outDir, "repository-ir.json"), JSON.stringify(ir, null, 2));
        writeFileSync(joinPath(outDir, "graph.json"), JSON.stringify({ nodes: ir.nodes, edges: ir.edges }, null, 2));
        writeFileSync(joinPath(outDir, "closure.json"), JSON.stringify(closure, null, 2));
        writeFileSync(joinPath(outDir, "coverage.json"), JSON.stringify(coverage, null, 2));
        process.stdout.write(
          `Wrote 4 artifact files to ${outDir}/ (${ir.capabilities.length} capabilities, ${closure.filter((c) => c.state === "CLOSED").length} closed)\n`,
        );
        return closure.every((c) => c.state === ClosureState.Closed) ? 0 : 1;
      }

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
    case "diff": {
      // Closure drift between two `rir compile --json` outputs (GAPS-v2 V11). CI-gateable:
      // exit 1 if any capability moved away from CLOSED.
      const [aPath, bPath] = rest.filter((a) => !a.startsWith("--"));
      if (!aPath || !bPath) {
        process.stderr.write("usage: rir diff <before.json> <after.json>\n");
        return 64;
      }
      const loadClosure = async (p: string): Promise<ClosureResult[]> => {
        const obj = JSON.parse(await readFile(p, "utf8")) as { closure?: ClosureResult[] };
        if (!obj.closure) throw new Error(`${p} has no 'closure' (use 'rir compile --json')`);
        return obj.closure;
      };
      const { transitions, regressions } = diffClosures(await loadClosure(aPath), await loadClosure(bPath));
      if (transitions.length === 0) {
        process.stdout.write("No closure changes.\n");
        return 0;
      }
      for (const t of transitions) {
        const mark = t.direction === "REGRESSED" ? "✗" : t.direction === "IMPROVED" ? "✓" : "~";
        process.stdout.write(`  ${mark} ${t.capabilityId}\t${t.from} -> ${t.to}\t(${t.direction})\n`);
      }
      if (regressions.length) {
        process.stderr.write(
          `\n${regressions.length} regression(s) — capabilities moved away from CLOSED.\n`,
        );
      }
      return regressions.length ? 1 : 0;
    }
    case "query": {
      // rir query <capability> <ir.json> — show a capability's chain + closure.
      const cap = rest.find((a) => !a.startsWith("--") && !a.endsWith(".json"));
      const jsonPath = rest.find((a) => a.endsWith(".json"));
      if (!cap || !jsonPath) {
        process.stderr.write("usage: rir query <capability> <compile.json>\n");
        return 64;
      }
      const { ir, closure } = await loadCompile(jsonPath);
      const matches = ir.capabilities.filter(
        (c) => c.capability === cap || c.capability.includes(cap.toUpperCase()),
      );
      if (matches.length === 0) {
        process.stdout.write(`No capability matching "${cap}".\n`);
        return 1;
      }
      const byId = new Map(ir.nodes.map((n) => [n.id, n] as const));
      for (const c of matches) {
        const r = closure.find((x) => x.capabilityId === c.id);
        process.stdout.write(
          `${c.capability}\t${r?.state ?? "?"}${r ? ` (confidence ${r.confidence})` : ""}\n`,
        );
        if (c.constraints.length) {
          process.stdout.write(
            `  constraints: ${c.constraints.map((k) => `${k.key}=${k.value}`).join(", ")}\n`,
          );
        }
        const chain = c.nodes.map((id) => byId.get(id)).filter(Boolean);
        for (const n of chain) process.stdout.write(`  - ${n!.kind}\t${n!.name}\n`);
      }
      return 0;
    }
    case "graph": {
      // rir graph <ir.json> [--capability <id>] — emit a Mermaid flowchart of the IR.
      const jsonPath = rest.find((a) => a.endsWith(".json"));
      if (!jsonPath) {
        process.stderr.write("usage: rir graph <compile.json> [--capability <id>]\n");
        return 64;
      }
      const capIdx = rest.indexOf("--capability");
      const only = capIdx === -1 ? undefined : rest[capIdx + 1];
      const { ir } = await loadCompile(jsonPath);
      let nodeIds = new Set(ir.nodes.map((n) => n.id));
      if (only) {
        const cap = ir.capabilities.find((c) => c.capability === only);
        nodeIds = new Set(cap?.nodes ?? []);
      }
      const safe = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "_");
      process.stdout.write("flowchart TD\n");
      for (const n of ir.nodes.filter((n) => nodeIds.has(n.id))) {
        process.stdout.write(`  ${safe(n.id)}["${n.kind}: ${n.name.replace(/"/g, "'")}"]\n`);
      }
      for (const e of ir.edges.filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to))) {
        process.stdout.write(`  ${safe(e.from)} -->|${e.kind}| ${safe(e.to)}\n`);
      }
      return 0;
    }
    case "snapshot": {
      // rir snapshot <ir.json> [--out-dir <dir>] — write a content-addressed snapshot file.
      const jsonPath = rest.find((a) => a.endsWith(".json") && !a.startsWith("--"));
      if (!jsonPath) {
        process.stderr.write("usage: rir snapshot <compile.json> [--out-dir <dir>]\n");
        return 64;
      }
      const snapOutIdx = rest.indexOf("--out-dir");
      const snapOutDir = snapOutIdx === -1 ? undefined : rest[snapOutIdx + 1];
      const { ir } = await loadCompile(jsonPath);
      const canonical = JSON.stringify(ir);
      const sha = hash64(canonical);
      const id = `snap|${sha}`;
      const dir = snapOutDir ?? "snapshots";
      mkdirSync(dir, { recursive: true });
      const outPath = joinPath(dir, `${sha}.json`);
      writeFileSync(outPath, JSON.stringify({ id, createdAt: new Date().toISOString(), repositoryHash: sha, ir }, null, 2));
      process.stdout.write(
        `${id}\t-> ${outPath}\t(${ir.nodes.length} nodes, ${ir.capabilities.length} capabilities)\n`,
      );
      return 0;
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
