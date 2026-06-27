import { describe, expect, it } from "vitest";
import { AdapterRegistry, TypeScriptAdapter } from "@rir/code-compiler";
import { compileDocuments, compileWithDocuments } from "@rir/compiler";

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

  it("reports that the code does not encode a documented constraint", async () => {
    const { findings } = await compileWithDocuments(
      "fixtures/fullstack-auth",
      "fixtures/fullstack-auth-docs",
      tsOnly(),
    );

    const missing = findings.find((f) => f.capability === "AUTH.LOGIN" && f.code === "MISSING_CONSTRAINT");
    expect(missing).toBeDefined();
    expect(missing!.message).toContain("LOGIN_IDENTIFIER");
  });
});
