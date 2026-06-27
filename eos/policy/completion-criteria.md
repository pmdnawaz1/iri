# Completion Criteria

The repository is **COMPLETE** only when every condition below holds. Each is machine
checkable from the EOS artifacts and the Repository Compiler pipeline.

- [ ] No remaining executable TSPEC (all `project.state.yaml` = `COMPLETE`)
- [ ] No blocked TSPEC (`project.health.yaml` `blocked_tspecs` = 0)
- [ ] No orphan TSPEC (Project Compiler emits no orphan warnings)
- [ ] No invalid dependency (dependency validator clean; no cycles)
- [ ] Repository builds (`pnpm build`)
- [ ] Tests pass (`pnpm test`)
- [ ] Coverage targets met (≥ 95%)
- [ ] Golden tests pass
- [ ] Repository IR valid
- [ ] Requirement IR valid
- [ ] Project IR valid (`pnpm eos:compile` clean + artifacts current)
- [ ] Closure complete (no BROKEN/ORPHAN/UNREACHABLE for required capabilities)
- [ ] Consistency complete (no ERROR findings)
- [ ] Ontology valid
- [ ] Architecture lock valid
- [ ] Project Compiler passes
- [ ] Repository Compiler passes
- [ ] All review gates satisfied
- [ ] `project.health.yaml` status = GREEN

Only when all boxes are checked does the Release Manager tag the repository COMPLETE.
