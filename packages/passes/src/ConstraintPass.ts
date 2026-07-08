import { AbstractPass } from "./base.js";
import type { CompilationContext, IRDraft } from "@rir/core";

export class ConstraintPass extends AbstractPass {
  readonly name = "ConstraintPass";
  run(_ctx: CompilationContext, _draft: IRDraft): void {}
}
