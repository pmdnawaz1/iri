# CI/CD Gates & Repository Compiler Pipeline

No PR merges unless every gate is green. No bypass. Implemented in
`.github/workflows/eos.yml`.

## PR gates

1. build (`pnpm build`, `tsc -b`)
2. typecheck (`pnpm typecheck`)
3. lint (`pnpm lint`)
4. unit / integration / golden tests (`pnpm test`)
5. Project Compiler (`pnpm eos:compile`) — Project IR validator
6. determinism gate — generated `eos/tspecs` + `eos/state` are up to date
7. Repository IR validator
8. Requirement IR validator
9. Project IR validator
10. closure validator
11. consistency validator
12. architecture-lock validator
13. dependency validator
14. TSPEC validator

## Repository Compiler pipeline (runs on merge to `main`)

```
Compile Repository
→ Compile Documentation
→ Compile TSPECs
→ Validate Repository IR
→ Validate Requirement IR
→ Validate Project IR
→ Run Reachability
→ Run Closure Engine
→ Run Coverage Engine
→ Run Consistency Engine
→ Run Ontology Validator
→ Run Graph Validator
→ Run Dependency Validator
→ Run Architecture Lock Validator
→ Update Project Graph
→ Update Project State
→ Update Metrics
→ Determine Newly Ready TSPECs
→ Generate Implementation Queue
→ Publish Repository Status
```

## Project Compiler responsibilities (gate 5)

Validate TSPEC schema, dependency graph, ownership, branch names, state transitions,
review chain; detect cycles, orphans, duplicates, impossible execution order; generate
the execution DAG, waves, and metrics. Fails CI on any violation.
