import { describe, expect, it } from "vitest";
import { prove } from "../../apps/cli/src/prove";

describe("proving slice: source -> IR -> closure", () => {
  it("detects the wired backend chain (route -> controller -> service -> repository)", async () => {
    const { results } = await prove("fixtures/express-auth");
    const result = results.find((r) => r.capabilityId.includes("AUTH.LOGIN"))!;
    expect(result).toBeDefined();
    expect(result.present).toContain("BACKEND_ROUTE");
    expect(result.present).toContain("CONTROLLER");
    expect(result.present).toContain("SERVICE");
    expect(result.present).toContain("REPOSITORY");
  });

  it("detects the broken backend (service unreachable from the route)", async () => {
    const { results } = await prove("fixtures/express-auth-broken");
    const result = results.find((r) => r.capabilityId.includes("AUTH.LOGIN"))!;
    expect(result).toBeDefined();
    expect(result.present).toContain("CONTROLLER");
    // SERVICE and REPOSITORY are optional stages (G2 / GAPS-FULL) — their absence
    // alone does not prevent closure. The chain is broken because the controller
    // never calls the service, so DATABASE and RESPONSE are also unreachable.
    expect(result.present).not.toContain("DATABASE");
    expect(result.state).not.toBe("CLOSED");
  });
});
