# RIR Document-Ontology Self-Evolution — Master Prompt

> Give this whole file to a capable AI (the semantic seam). Its job: compile real **documents**
> (READMEs, /docs, product specs, OpenAPI/AsyncAPI) with `rir`, find requirement statements the
> ontology does NOT yet cover, and **propose** either (a) new **aliases** for existing
> capabilities, or (b) new capabilities. It PROPOSES; it never edits `packages/ontology` and
> never writes into the IR. A human architect accepts a proposal as a versioned ontology change
> + an ADR. (See `docs/ADR-0018` and `docs/ADR-0019`.)

---

## Why this is a *separate* prompt from code self-evolution

There is **one** ontology, shared by code and docs — that is the whole point: the tool compares
"documented vs implemented" on the **same** capability ids. So this is not a "document ontology"
vs a "code ontology". What differs is the **frontend** and the **resolver**:

| | Code self-evolution | Document self-evolution (this file) |
| --- | --- | --- |
| Frontend | language adapters → routes/call graph | markdown/OpenAPI → statements |
| Unit of evidence | an HTTP route / call chain | a requirement sentence |
| Unmapped signal | `feature: "UNMAPPED"` capability (ORPHAN) | `feature: "UNMAPPED"` **requirement** + `DOC_UNMAPPED` finding |
| Typical proposal | a new capability (cross-repo route) | often a new **alias** (same concept, new wording) |

Docs phrase the same concepts in endless natural language ("sign in", "log on", "authenticate",
"start a session"). The code resolver matches structure; the doc resolver must match **meaning**.
That gap is exactly where you (the seam) earn your keep.

---

## The determinism rule (read this twice)

The RIR truth path is **deterministic**: reproducible across runs and across model versions. So:

- The in-repo normalizer (`packages/document-compiler`) maps a statement → capability using only
  **lexical** rules: exact capability-name / alias match, and multi-word name-token match
  (`RESET_PASSWORD`). High precision, low recall. **No embeddings, no thresholds, no model** sit
  in this path — a thresholded fuzzy match would silently *invent* requirements and corrupt the
  consistency report.
- Statements the lexical resolver cannot place are **not dropped**. They become
  `UNMAPPED.<SECTION>` requirements (`feature: "UNMAPPED"`) and surface as `DOC_UNMAPPED` findings.
  **That UNMAPPED set is your worklist.**

**You (the seam) may use anything — BM25, embeddings/vectors, cross-encoders, an LLM** — but only
to produce *proposals* in the review queue. The way recall actually improves is:

```
you propose an ALIAS  ("sign in" → AUTH.LOGIN)
   → human adds it to packages/ontology + ADR + bumps ONTOLOGY_VERSION
   → next deterministic compile, that statement maps with NO fuzzy matching at all.
```

Embeddings get you to the proposal; the **alias** is what makes the deterministic core catch it
forever after. ML never decides truth — it only grows the lexicon the deterministic core reads.

---

## The loop

```
for each documentation source:
  1. clone/fetch it; locate its docs (README.md, /docs/**, openapi.yaml, *.md specs)
  2. rir compile <code-dir> --docs <docs-dir> --json > report.json
  3. read report.json:
       - requirements.requirements         (documented Requirement IR)
       - findings                          (doc<->code consistency, incl. DOC_UNMAPPED)
  4. WORKLIST = requirements with feature == "UNMAPPED"  (+ every DOC_UNMAPPED finding)
  5. for each UNMAPPED statement, decide which bucket it is:
       (A) EXISTING capability, new wording   → propose an ALIAS
       (B) genuinely new capability           → propose a CAPABILITY (needs cross-source evidence)
       (C) not a requirement (narrative)      → drop (the cue filter should have caught it)
  6. write proposals to docs/ontology-candidates/<FEATURE>.md  (review queue, never the ontology)
human architect:
  7. accept good proposals → edit packages/ontology + ADR + bump version; re-compile: those
     statements now map deterministically; DOC_UNMAPPED shrinks; coverage grows.
```

## How to decide bucket A vs B (this is the embeddings/BM25 part)

Build a **lexical profile** per existing capability from `packages/ontology/src/index.ts`:
`name + aliases + outputs + constraint keys + the capability's natural-language gloss`. Then for
each UNMAPPED statement, rank capabilities by similarity. Use the cheapest signal that separates
the cases; escalate only when needed:

1. **BM25 / token overlap** over the profiles. Cheap, explainable, language-agnostic. Great first
   filter. If the top hit is far above the rest and shares a head verb/noun ("log on" vs LOGIN
   profile), it is almost certainly **bucket A → alias**.
2. **Embedding cosine (vectors)** when lexical overlap is thin but meaning is close ("start a
   session" ↔ LOGIN). Compute a vector for the statement and for each profile; cosine-rank.
3. **Cross-encoder / LLM judgment** only for the ambiguous middle.

Decision policy (you apply judgment; the repo does not):
- **High similarity to exactly one capability** → propose an **ALIAS** for that capability. Quote
  the surface form you'd add (e.g. add `"sign in"`, `"log on"` to `AUTH.LOGIN.aliases`).
- **Diffuse similarity / a coherent new concept across 2+ sources** → propose a **CAPABILITY**.
- **A single source, no code, vague** → leave it UNMAPPED; do not propose on one weak example.

> Why BM25 *and* vectors? BM25 nails lexical variants (cheap, no model) and is reproducible enough
> to even prototype in-repo if we ever want a *suggestion-only* CLI helper. Embeddings catch
> paraphrase BM25 misses. Neither is allowed to auto-map — both only rank candidates for a human.

## Proposal format

For an **alias** (bucket A) — the common case for docs — append to the relevant feature file:

```md
# Candidate: ALIAS for AUTH.LOGIN

- Surface forms seen: "sign in" (stripe-docs README#12), "log on" (acme-spec#4)
- Similarity: BM25 top-1 = AUTH.LOGIN (score 7.8, next 1.1); embedding cosine 0.83
- Proposed change: add aliases ["sign in", "sign-in", "log on", "logon"] to AUTH.LOGIN
- Evidence (locators from report.json): docs/auth.md#12, docs/auth.md#13
```

For a **new capability** (bucket B) — mirror `CapabilityDefinition`, exactly like the code prompt:

```md
# Candidate feature: AUDIT

- Source docs: acme-spec (#audit-log), other-product (/docs/audit.md)
- Rationale: documented as a MUST across 2+ products; no existing capability fits.

## Proposed capabilities
- AUDIT.RECORD   aliases: ["audit log","activity log","audit trail"]   chain: BACKEND
- AUDIT.QUERY    aliases: ["view audit log"]                            chain: BACKEND

## Proposed constraints (ontology-typed enums only, grounded in the docs)
- AUDIT_RETENTION_DAYS = INTEGER

## Evidence
- statements: report.json requirements[feature==UNMAPPED] with these locators: [...]
```

## Hard invariants (do not break)

1. You may READ `report.json` and WRITE proposals to `docs/ontology-candidates/` only.
2. You NEVER edit `packages/ontology`, the IR, the normalizer, or any compiler code.
3. Capability ids are canonical **software** concepts, `FEATURE.CAPABILITY` (AUDIT.RECORD), never
   product/framework names.
4. No proposal without statement evidence (a `report.json` locator).
5. Prefer an **alias** over a new capability whenever an existing capability fits — a new alias is
   cheaper, safer, and immediately closes a `DOC_UNMAPPED` on the next compile.
6. Embeddings/BM25/LLM are for *ranking candidates only*. They never decide a mapping in the repo.

---

## Seed documentation sources (compile docs + code of the same product)

Point `--docs` at the docs tree and the positional dir at the code, so the same run yields both
the Requirement IR and the doc↔code findings.

| Domain | Repo | Docs dir | Code dir |
| --- | --- | --- | --- |
| E-commerce | https://github.com/medusajs/medusa | `www/apps/resources` / `*.md` | `packages/medusa/src/api` |
| Headless CMS | https://github.com/directus/directus | `docs` | `api/src` |
| Headless CMS | https://github.com/strapi/strapi | `docs` | `packages/core` |
| Scheduling | https://github.com/calcom/cal.com | `apps/docs` | `apps/api` |
| Notifications | https://github.com/novuhq/novu | `docs` | `apps/api/src` |
| Automation | https://github.com/n8n-io/n8n | `docs` | `packages/cli/src` |
| Auth | https://github.com/supabase/auth | `README.md` + `/docs` | `internal/api` |
| Git hosting | https://github.com/go-gitea/gitea | `docs` | `routers` |
| API spec only | any public `openapi.yaml` / `swagger.json` | the spec file | — |

> OpenAPI/AsyncAPI specs are the richest doc source: every operation is a near-requirement. Once
> `DF02` (OpenAPI frontend) lands, point `--docs` at the spec directly — each path+verb+summary
> becomes a statement the normalizer maps to a capability, and unmapped operations become the same
> UNMAPPED worklist you grow the ontology from.

## Use the UNMAPPED + DOC_UNMAPPED records — never miss

The document compiler **never silently drops a requirement**. A requirement-like sentence that the
lexical resolver cannot place becomes a `feature: "UNMAPPED"` requirement and a `DOC_UNMAPPED`
finding. Scan `report.json` for both; that union is your candidate worklist. Cluster by concept,
rank with BM25/embeddings, and propose aliases first, new capabilities second — always with
locator evidence, always into the review queue.
