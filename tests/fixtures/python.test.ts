import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PythonAdapter } from "@rir/code-compiler";
import type { CompilationContext } from "@rir/core";

const ctx: CompilationContext = {
  repositoryRoot: ".",
  artifacts: [],
  logger: {
    debug() {},
    info() {},
    warn() {},
    error() {},
    child() {
      return this;
    },
  },
};

const fixtureDir = join(import.meta.dirname, "../../fixtures/python");

const authServiceSource = readFileSync(
  join(fixtureDir, "auth_service.py"),
  "utf-8",
);
const userRepositorySource = readFileSync(
  join(fixtureDir, "user_repository.py"),
  "utf-8",
);

describe("TSPEC-FX10: Python fixture", () => {
  it("symbols include class AuthService and method login", () => {
    const adapter = new PythonAdapter();
    const result = adapter.parse("auth_service.py", authServiceSource, ctx);
    expect(
      result.symbols.some(
        (s) => s.name === "AuthService" && s.kind === "class",
      ),
    ).toBe(true);
    expect(
      result.symbols.some((s) => s.name === "login" && s.kind === "method"),
    ).toBe(true);
  });

  it("imports include the repository import", () => {
    const adapter = new PythonAdapter();
    const result = adapter.parse("auth_service.py", authServiceSource, ctx);
    expect(
      result.imports.some(
        (i) =>
          i.specifier === "user_repository" ||
          i.specifier.includes("UserRepository"),
      ),
    ).toBe(true);
  });

  it("calls include the repository call (self.repo.find_by_email)", () => {
    const adapter = new PythonAdapter();
    const result = adapter.parse("auth_service.py", authServiceSource, ctx);
    expect(
      result.calls.some((c) =>
        c.callee.includes("self.repo.find_by_email"),
      ),
    ).toBe(true);
  });

  it("UserRepository extracted from its file", () => {
    const adapter = new PythonAdapter();
    const result = adapter.parse(
      "user_repository.py",
      userRepositorySource,
      ctx,
    );
    expect(
      result.symbols.some(
        (s) => s.name === "UserRepository" && s.kind === "class",
      ),
    ).toBe(true);
  });

  it("determinism: two parses of auth_service.py are deep-equal", () => {
    const adapter = new PythonAdapter();
    const r1 = adapter.parse("auth_service.py", authServiceSource, ctx);
    const r2 = adapter.parse("auth_service.py", authServiceSource, ctx);
    expect(r1).toEqual(r2);
  });
});
