import { describe, it, expect } from "vitest";
import { TypeScriptAdapter } from "@rir/code-compiler";
import type { LanguageAdapter } from "@rir/code-compiler";
import type { CompilationContext } from "@rir/core";

const ctx: CompilationContext = { repositoryRoot: ".", artifacts: [], logger: { debug() {}, info() {}, warn() {}, error() {}, child() { return this; } } };

const appSource = `export class UserRepository {
  findByEmail(email: string) {
    return { email };
  }
}

export class AuthService {
  private userRepository = new UserRepository();
  login(email: string) {
    return this.userRepository.findByEmail(email);
  }
}

export class AuthController {
  private authService = new AuthService();
  login(email: string) {
    return this.authService.login(email);
  }
}`;

const routesSource = `import { AuthController } from "./app";

export function register(router: any) {
  const authController = new AuthController();
  router.post("/login", (req: any, res: any) => {
    const result = authController.login(req.body.email);
    res.json(result);
  });
}`;

describe("TypeScriptAdapter", () => {
  it("is assignable to LanguageAdapter", () => {
    const adapter: LanguageAdapter = new TypeScriptAdapter();
    expect(adapter).toBeDefined();
  });

  it("supports .ts and .tsx", () => {
    const adapter = new TypeScriptAdapter();
    expect(adapter.supports("file.ts")).toBe(true);
    expect(adapter.supports("file.tsx")).toBe(true);
    expect(adapter.supports("file.js")).toBe(false);
  });

  it("parses app.ts yields 3 exported classes", () => {
    const adapter = new TypeScriptAdapter();
    const result = adapter.parse("app.ts", appSource, ctx);
    const classes = result.symbols.filter(s => s.kind === "class");
    expect(classes.length).toBe(3);
    expect(classes.every(c => c.exported)).toBe(true);
  });

  it("parses routes.ts yields one POST /login route", () => {
    const adapter = new TypeScriptAdapter();
    const result = adapter.parse("routes.ts", routesSource, ctx);
    expect(result.routes.length).toBe(1);
    expect(result.routes[0]).toEqual(expect.objectContaining({ method: "POST", path: "/login" }));
  });

  it("calls include this.authService.login for app.ts", () => {
    const adapter = new TypeScriptAdapter();
    const result = adapter.parse("app.ts", appSource, ctx);
    expect(result.calls.some(c => c.callee.includes("this.authService.login"))).toBe(true);
  });

  it("empty source yields empty arrays + valid artifact", () => {
    const adapter = new TypeScriptAdapter();
    const result = adapter.parse("empty.ts", "", ctx);
    expect(result.symbols).toEqual([]);
    expect(result.imports).toEqual([]);
    expect(result.calls).toEqual([]);
    expect(result.routes).toEqual([]);
    expect(result.artifact).toBeDefined();
    expect(result.artifact.hash).toBeTruthy();
  });

  it("determinism: two parses deep-equal", () => {
    const adapter = new TypeScriptAdapter();
    const r1 = adapter.parse("app.ts", appSource, ctx);
    const r2 = adapter.parse("app.ts", appSource, ctx);
    expect(r1).toEqual(r2);
  });
});
