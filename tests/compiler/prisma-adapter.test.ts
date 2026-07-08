import { describe, it, expect } from "vitest";
import { PrismaAdapter } from "../../packages/code-compiler/src/language/prisma.js";
import type { CompilationContext } from "@rir/core";

const ctx: CompilationContext = {
  repositoryRoot: ".",
  artifacts: [],
  logger: { debug() {}, info() {}, warn() {}, error() {}, child() { return this; } },
};

describe("PrismaAdapter", () => {
  const adapter = new PrismaAdapter();

  it("supports .prisma files", () => {
    expect(adapter.supports("schema.prisma")).toBe(true);
    expect(adapter.supports("app.ts")).toBe(false);
  });

  it("extracts models and enums with fields as source text", () => {
    const schema = `
generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      Role     @default(USER)
  createdAt DateTime @default(now())
}

enum Role {
  USER
  ADMIN
}
`;
    const result = adapter.parse("schema.prisma", schema, ctx);
    expect(result.artifact.language).toBe("prisma");
    expect(result.symbols.length).toBeGreaterThanOrEqual(2);

    const user = result.symbols.find(s => s.name === "User");
    expect(user).toBeDefined();
    expect(user!.kind).toBe("class");
    expect(user!.sourceText).toContain("email");
    expect(user!.sourceText).toContain("@unique");
    expect(user!.sourceText).toContain("role");
    expect(user!.sourceText).toContain("Role");

    const role = result.symbols.find(s => s.name === "Role");
    expect(role).toBeDefined();
    expect(role!.kind).toBe("enum");
    expect(role!.sourceText).toContain("USER");
    expect(role!.sourceText).toContain("ADMIN");
  });
});
