import { describe, it, expect } from "vitest";
import { CSSAdapter } from "../../packages/code-compiler/src/language/css.js";
import type { CompilationContext } from "@rir/core";

const ctx: CompilationContext = {
  repositoryRoot: ".",
  artifacts: [],
  logger: { debug() {}, info() {}, warn() {}, error() {}, child() { return this; } },
};

describe("CSSAdapter", () => {
  const adapter = new CSSAdapter();

  it("supports .css, .scss, .sass", () => {
    expect(adapter.supports("style.css")).toBe(true);
    expect(adapter.supports("style.scss")).toBe(true);
    expect(adapter.supports("style.sass")).toBe(true);
    expect(adapter.supports("app.tsx")).toBe(false);
  });

  it("extracts CSS selectors as symbols with source text", () => {
    const css = `
.footer {
  position: sticky;
  bottom: 0;
  background: black;
}

@media (max-width: 768px) {
  .hamburger-menu {
    display: flex;
  }
}
`;
    const result = adapter.parse("globals.css", css, ctx);
    expect(result.artifact.language).toBe("css");
    expect(result.symbols.length).toBeGreaterThanOrEqual(2);
    
    const footer = result.symbols.find(s => s.name.includes("footer"));
    expect(footer).toBeDefined();
    expect(footer!.sourceText).toContain("position: sticky");
    expect(footer!.sourceText).toContain("bottom: 0");

    const hamburger = result.symbols.find(s => s.name.includes("hamburger") || s.sourceText?.includes("hamburger"));
    expect(hamburger).toBeDefined();
    expect(hamburger!.sourceText).toContain("display: flex");
  });

  it("carries full source in ParseResult.source", () => {
    const css = ".footer { color: red; }";
    const result = adapter.parse("style.css", css, ctx);
    expect(result.source).toBe(css);
  });
});
