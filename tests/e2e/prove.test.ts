import { describe, expect, it } from "vitest";
import { prove } from "../../apps/cli/src/prove";

describe("proving slice: source -> IR -> closure", () => {
  it("detects the wired backend chain (route -> controller -> service -> repository)", () => {
    const { result } = prove("fixtures/express-auth");
    expect(result.present).toContain("BACKEND_ROUTE");
    expect(result.present).toContain("CONTROLLER");
    expect(result.present).toContain("SERVICE");
    expect(result.present).toContain("REPOSITORY");
  });

  it("detects the broken backend (service unreachable from the route)", () => {
    const { result } = prove("fixtures/express-auth-broken");
    expect(result.present).toContain("CONTROLLER");
    expect(result.present).not.toContain("SERVICE");
    expect(result.missing).toContain("SERVICE");
    expect(result.missing).toContain("REPOSITORY");
  });
});
