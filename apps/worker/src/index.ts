/**
 * @rir/worker — Background job runner.
 *
 * Declares the canonical job roster and a deterministic dispatcher. Job bodies that
 * depend on the builder pipeline are registered but not yet executable; the worker
 * framework (registry + dispatch) is complete.
 */

import { ConsoleLogger, type Logger } from "@rir/common";

/** Canonical background jobs. */
export const JOB_NAMES = [
  "CompileRepository",
  "CompileDocuments",
  "RebuildGraph",
  "OntologyUpdate",
  "SnapshotGeneration",
  "GitHistoryAnalysis",
] as const;
export type JobName = (typeof JOB_NAMES)[number];

export interface Job {
  readonly name: JobName;
  run(logger: Logger): Promise<void>;
}

/** Registry + dispatcher for background jobs. */
export class Worker {
  private readonly jobs = new Map<JobName, Job>();
  constructor(private readonly logger: Logger = new ConsoleLogger("info")) {}

  register(job: Job): this {
    this.jobs.set(job.name, job);
    return this;
  }

  async dispatch(name: JobName): Promise<void> {
    const job = this.jobs.get(name);
    if (!job) throw new Error(`no job registered: ${name}`);
    this.logger.info("job start", { job: name });
    await job.run(this.logger.child({ job: name }));
    this.logger.info("job done", { job: name });
  }
}

import { CompileRepository } from "./jobs/compile-repository.js";
export { CompileRepository };
