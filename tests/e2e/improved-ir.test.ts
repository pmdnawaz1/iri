import { describe, it, expect } from "vitest";
import { compileRepository } from "@rir/compiler";
import { TypeScriptAdapter, CSSAdapter, AdapterRegistry } from "@rir/code-compiler";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

describe("end-to-end IRI improvements", () => {
  const tmpDir = join(import.meta.dirname, "..", "fixtures", "e2e-improved");
  
  // Create a mini-project with TS + CSS + package.json
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
  writeFileSync(join(tmpDir, "package.json"), JSON.stringify({
    name: "test-app",
    dependencies: { next: "14", react: "18", tailwindcss: "3" },
  }));
  writeFileSync(join(tmpDir, "layout.tsx"), `
import { Footer } from "./footer";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
`);
  writeFileSync(join(tmpDir, "footer.tsx"), `
export function Footer() {
  return <footer className="sticky bottom-0 bg-black text-white">Footer</footer>;
}
`);
  writeFileSync(join(tmpDir, "globals.css"), `
.footer {
  position: sticky;
  bottom: 0;
  background: black;
}

@media (max-width: 768px) {
  .hamburger-menu {
    display: flex;
    flex-direction: column;
  }
}
`);

  afterAll(() => rmSync(tmpDir, { recursive: true, force: true }));

  it("compiles with relative paths, source text, frameworks, and CSS", async () => {
    const reg = new AdapterRegistry()
      .register(new TypeScriptAdapter())
      .register(new CSSAdapter());
    const { ir } = await compileRepository(tmpDir, reg);

    // 1. Frameworks detected
    expect(ir.frameworks).toContain("next.js");
    expect(ir.frameworks).toContain("react");
    expect(ir.frameworks).toContain("tailwind");

    // 2. Relative file paths (no absolute or temp paths)
    for (const node of ir.nodes) {
      if (node.filePath) {
        expect(node.filePath).not.toMatch(/^[A-Z]:\\/);
        expect(node.filePath).not.toContain("\\Temp\\");
      }
    }

    // 3. Source text populated on component nodes
    const appShell = ir.nodes.find(n => n.name === "AppShell");
    expect(appShell).toBeDefined();
    expect(appShell!.sourceText).toBeDefined();
    expect(appShell!.sourceText).toContain("Footer");
    expect(appShell!.sourceText).toContain("min-h-screen");

    const footer = ir.nodes.find(n => n.name === "Footer");
    expect(footer).toBeDefined();
    expect(footer!.sourceText).toContain("sticky");
    expect(footer!.sourceText).toContain("bg-black");

    // 4. CSS nodes present
    const cssNodes = ir.nodes.filter(n => n.kind === "PROPERTY");
    expect(cssNodes.length).toBeGreaterThanOrEqual(1);
    
    const footerCss = cssNodes.find(n => n.sourceText?.includes("footer") || n.name.includes("footer"));
    expect(footerCss).toBeDefined();
    expect(footerCss!.sourceText).toContain("position: sticky");

    // 5. AppShell source text references Footer (render tree is in source text)
    expect(appShell!.sourceText).toContain("Footer");
    expect(appShell!.sourceText).toContain("min-h-screen");
  });
});
