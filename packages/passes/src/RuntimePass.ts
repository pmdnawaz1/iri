import { AbstractPass } from "./base.js";
import type { CompilationContext, IRDraft } from "@rir/core";

export class RuntimePass extends AbstractPass {
  readonly name = "RuntimePass";
  run(_ctx: CompilationContext, _draft: IRDraft): void {}
}
