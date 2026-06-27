import { describe, expect, it } from "vitest";
import { allCapabilities, getCapability, resolveAlias } from "@rir/ontology";

describe("ontology", () => {
  it("exposes AUTH.LOGIN with its expected chain and constraints", () => {
    const login = getCapability("AUTH.LOGIN");
    expect(login).toBeDefined();
    expect(login!.expectedChain).toContain("BACKEND_ROUTE");
    expect(login!.outputs).toContain("JWT");
  });

  it("resolves only explicitly-declared aliases", () => {
    expect(resolveAlias("signin")?.id).toBe("AUTH.LOGIN");
    expect(resolveAlias("SignIn")?.id).toBe("AUTH.LOGIN");
    // Not declared anywhere -> never guessed.
    expect(resolveAlias("authenticate")).toBeUndefined();
  });

  it("has unique capability ids", () => {
    const ids = allCapabilities().map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
