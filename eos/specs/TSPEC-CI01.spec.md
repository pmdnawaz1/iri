# TSPEC-CI01 — ESLint config + lint gate (Work Order)

> Authored by ROLE_ARCHITECT. Add a real ESLint setup so the CI `lint` step can stop being
> `continue-on-error`.

- **TSPEC:** TSPEC-CI01 · **Owner:** ROLE_IMPLEMENTER · **Header:** `eos/tspecs/TSPEC-CI01.yaml`
- **Depends on:** TSPEC-I001 — COMPLETE · **Wave:** 3

## Objective
Add a flat ESLint config for the TypeScript workspace and make `pnpm lint` pass on the
current tree, then turn the CI lint gate on.

## Files
- create `eslint.config.js` (flat config) at repo root
- modify root `package.json` (add devDeps: `eslint`, `typescript-eslint`, `@eslint/js`)
- modify `.github/workflows/eos.yml` (remove `continue-on-error` from the Lint step)

## Behavior
- Use `typescript-eslint` flat config (`tseslint.config(...)`) extending the recommended
  (non-type-checked) rules. Lint `packages/**/*.ts`, `apps/**/*.ts`, `tests/**/*.ts`,
  `eos/compiler/**/*.ts`. Ignore `**/dist`, `node_modules`, `eos/state`, `eos/tspecs`.
- Keep rules pragmatic: the goal is a passing baseline, not a strict overhaul. Disable or
  downgrade any rule that would require touching unrelated code (e.g. allow `no-explicit-any`
  as warn). `pnpm lint` MUST exit 0 on the current tree.
- The existing root `lint` script is `eslint .` — keep or scope it to the globs above.

## Acceptance
1. `pnpm lint` exits 0 on the current repository.
2. `eslint.config.js` is a valid flat config loaded by ESLint v9.
3. the CI `Lint` step no longer has `continue-on-error: true`.

## Forbidden
Do NOT change product source to satisfy lint beyond trivial, safe auto-fixes. Do NOT change
the IR / ontology / pipeline. Do NOT minify.

## References
typescript-eslint flat config: https://typescript-eslint.io/getting-started/
ESLint flat config: https://eslint.org/docs/latest/use/configure/configuration-files

## Done
`pnpm lint` green · build · typecheck · PR `chore(tspec-ci01): eslint config + lint gate`.
