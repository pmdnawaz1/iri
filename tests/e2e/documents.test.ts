import { describe, expect, it } from "vitest";
import { AdapterRegistry, TypeScriptAdapter } from "@rir/code-compiler";
import { compileDocuments, compileWithDocuments, suggestDocumentAliases } from "@rir/compiler";

// The Document Compiler axis (ADR-0019/0020): markdown -> Requirement IR, then doc<->code
// consistency. This proves the tool can say "documented vs implemented vs consistent".
describe("Document Compiler — requirements.md -> Requirement IR", () => {
  it("normalizes documented capabilities onto the ontology", () => {
    const reqs = compileDocuments("fixtures/fullstack-auth-docs");
    const ids = reqs.requirements.map((r) => r.capability).sort();

    // LOGIN (single-token) and RESET_PASSWORD (multi-word) both resolve.
    expect(ids).toContain("AUTH.LOGIN");
    expect(ids).toContain("AUTH.RESET_PASSWORD");

    const login = reqs.requirements.find((r) => r.capability === "AUTH.LOGIN")!;
    expect(login.priority).toBe("MUST");
    // The constraint sentence ("email as the login identifier") is extracted.
    expect(login.constraints.find((c) => c.key === "LOGIN_IDENTIFIER")?.value).toBe("EMAIL");
    // Provenance points back to the document.
    expect(login.evidence.every((e) => e.source === "DOCUMENTATION")).toBe(true);
  });
});

describe("Document Compiler — OpenAPI spec -> Requirement IR (DF02)", () => {
  it("treats each operation as a requirement and maps it to the ontology", () => {
    const reqs = compileDocuments("fixtures/openapi-auth");
    const ids = reqs.requirements.map((r) => r.capability).sort();

    // operationId/summary/tags resolve POST /login and POST /register.
    expect(ids).toContain("AUTH.LOGIN");
    expect(ids).toContain("AUTH.REGISTER");
    // An operation with no ontology home is tracked, never dropped.
    expect(ids.some((id) => id.startsWith("UNMAPPED."))).toBe(true);
  });
});

describe("Alias suggester — deterministic BM25 (proposal-only)", () => {
  it("ranks capabilities for UNMAPPED statements and exposes the matched terms", () => {
    const suggestions = suggestDocumentAliases("fixtures/fullstack-auth-docs");

    // The "authentication" statement matches no capability profile token -> NEW candidate.
    const auth = suggestions.find((s) => s.statement.includes("authentication"));
    expect(auth).toBeDefined();
    expect(auth!.candidates).toHaveLength(0);

    // Determinism: identical inputs -> identical ranking.
    const again = suggestDocumentAliases("fixtures/fullstack-auth-docs");
    expect(again).toEqual(suggestions);
  });

  it("never returns a capability it could not justify with matched terms", () => {
    const suggestions = suggestDocumentAliases("fixtures/fullstack-auth-docs");
    for (const s of suggestions) {
      for (const c of s.candidates) {
        expect(c.matched.length).toBeGreaterThan(0);
        expect(c.score).toBeGreaterThan(0);
      }
    }
  });
});

describe("Cross-consistency — docs vs code", () => {
  const tsOnly = () => new AdapterRegistry().register(new TypeScriptAdapter());

  it("tracks a documented requirement the ontology cannot place as DOC_UNMAPPED", async () => {
    const { findings, requirements } = await compileWithDocuments(
      "fixtures/fullstack-auth",
      "fixtures/fullstack-auth-docs",
      tsOnly(),
    );

    // The "audit log" requirement maps to no ontology capability — never dropped.
    const unmapped = requirements.requirements.find((r) => r.capability === "UNMAPPED.AUDIT_LOG");
    expect(unmapped).toBeDefined();
    expect(unmapped!.feature).toBe("UNMAPPED");

    const finding = findings.find((f) => f.code === "DOC_UNMAPPED" && f.capability === "UNMAPPED.AUDIT_LOG");
    expect(finding).toBeDefined();
  });

  it("flags a documented-but-unimplemented MUST capability as an ERROR", async () => {
    const { findings } = await compileWithDocuments(
      "fixtures/fullstack-auth",
      "fixtures/fullstack-auth-docs",
      tsOnly(),
    );

    const reset = findings.find((f) => f.capability === "AUTH.RESET_PASSWORD");
    expect(reset).toBeDefined();
    expect(reset!.code).toBe("UNIMPLEMENTED");
    expect(reset!.severity).toBe("ERROR");
  });

  it("does not flag the implemented+documented capability as unimplemented", async () => {
    const { findings } = await compileWithDocuments(
      "fixtures/fullstack-auth",
      "fixtures/fullstack-auth-docs",
      tsOnly(),
    );

    const loginUnimpl = findings.find((f) => f.capability === "AUTH.LOGIN" && f.code === "UNIMPLEMENTED");
    expect(loginUnimpl).toBeUndefined();
  });

  it("matches the documented constraint to the code-extracted one (G1: no MISSING/MISMATCH)", async () => {
    const { ir, findings } = await compileWithDocuments(
      "fixtures/fullstack-auth",
      "fixtures/fullstack-auth-docs",
      tsOnly(),
    );

    // G1: the code now declares LOGIN_IDENTIFIER=EMAIL (from `req.body.email`), matching the doc.
    const login = ir.capabilities.find((c) => c.capability === "AUTH.LOGIN")!;
    expect(login.constraints.find((c) => c.key === "LOGIN_IDENTIFIER")?.value).toBe("EMAIL");

    const constraintFindings = findings.filter(
      (f) =>
        f.capability === "AUTH.LOGIN" &&
        (f.code === "MISSING_CONSTRAINT" || f.code === "CONSTRAINT_MISMATCH"),
    );
    expect(constraintFindings).toHaveLength(0);
  });
});
