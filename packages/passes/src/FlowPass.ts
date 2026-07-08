import { AbstractPass } from "./base.js";
import type { CompilationContext, IRDraft } from "@rir/core";

export class FlowPass extends AbstractPass {
  readonly name = "FlowPass";
  run(_ctx: CompilationContext, _draft: IRDraft): void {}
}
