import { type Job, type JobName } from "../index.js";
import type { Logger } from "@rir/common";
import { makeId, hash64 } from "@rir/common";
import { compileRepository } from "@rir/compiler";
import { type Storage, InMemoryStorage } from "@rir/storage";
import type { SnapshotIR } from "@rir/ir";

export class CompileRepository implements Job {
  readonly name: JobName = "CompileRepository";

  constructor(
    private readonly dir: string,
    private readonly storage: Storage = new InMemoryStorage()
  ) {}

  async run(logger: Logger): Promise<void> {
    logger.info(`compiling repository at ${this.dir}`);
    
    // The spec doesn't specify if we need an adapter registry passed, compileRepository defaults it if undefined.
    // Assuming compileRepository(dir) works as requested.
    const { ir } = await compileRepository(this.dir);
    
    const hash = hash64(this.dir); // Spec says "repositoryHash: <hash of dir path>"
    const snapshot: SnapshotIR = {
      id: makeId("snap", this.dir, hash),
      createdAt: new Date().toISOString(),
      repositoryHash: hash,
      ir,
    };
    
    await this.storage.saveSnapshot(snapshot);
    logger.info(`saved snapshot ${snapshot.id}`);
  }
}
