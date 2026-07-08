import { describe, it, expect } from "vitest";
import { compileRepository } from "@rir/compiler";
import { TypeScriptAdapter, AdapterRegistry } from "@rir/code-compiler";
import { existsSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

describe("framework detection", () => {
  it("detects frameworks from package.json", async () => {
    // Create a temp project with package.json
    const tmpDir = join(import.meta.dirname, "..", "fixtures", "fw-test");
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
    writeFileSync(join(tmpDir, "package.json"), JSON.stringify({
      name: "test",
      dependencies: { next: "14", react: "18", tailwindcss: "3", "@prisma/client": "5" },
    }));
    writeFileSync(join(tmpDir, "app.ts"), `export const x = 1;\n`);

    try {
      const reg = new AdapterRegistry().register(new TypeScriptAdapter());
      const { ir } = await compileRepository(tmpDir, reg);
      expect(ir.frameworks).toBeDefined();
      expect(ir.frameworks).toContain("next.js");
      expect(ir.frameworks).toContain("react");
      expect(ir.frameworks).toContain("tailwind");
      expect(ir.frameworks).toContain("prisma");
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("detects frameworks from requirements.txt", async () => {
    const tmpDir = join(import.meta.dirname, "..", "fixtures", "fw-py-test");
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
    writeFileSync(join(tmpDir, "requirements.txt"), "fastapi>=0.100\nsqlalchemy\npydantic\nredis\n");
    writeFileSync(join(tmpDir, "app.py"), `x = 1\n`);

    try {
      const { ir } = await compileRepository(tmpDir);
      expect(ir.frameworks).toBeDefined();
      expect(ir.frameworks).toContain("fastapi");
      expect(ir.frameworks).toContain("sqlalchemy");
      expect(ir.frameworks).toContain("pydantic");
      expect(ir.frameworks).toContain("redis");
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
