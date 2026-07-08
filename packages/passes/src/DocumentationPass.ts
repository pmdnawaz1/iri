import { AbstractPass } from "./base.js";
import type { CompilationContext, IRDraft } from "@rir/core";

export class DocumentationPass extends AbstractPass {
  readonly name = "DocumentationPass";
  run(_ctx: CompilationContext, _draft: IRDraft): void {}
}
