import { AbstractPass } from "./base.js";
import type { CompilationContext, IRDraft } from "@rir/core";

export class OwnershipPass extends AbstractPass {
  readonly name = "OwnershipPass";
  run(_ctx: CompilationContext, _draft: IRDraft): void {}
}
