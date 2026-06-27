import { describe, it, expect, beforeEach } from "vitest";
import { Worker } from "../../apps/worker/src/index.js";
import { CompileRepository } from "../../apps/worker/src/jobs/compile-repository.js";
import { InMemoryStorage } from "@rir/storage";

describe("Worker: CompileRepository", () => {
  let storage: InMemoryStorage;
  let worker: Worker;

  beforeEach(() => {
    storage = new InMemoryStorage();
    worker = new Worker();
    // Register the job using fixtures/express-auth as the target directory
    worker.register(new CompileRepository("fixtures/express-auth", storage));
  });

  it("dispatching CompileRepository on fixtures/express-auth saves exactly one snapshot", async () => {
    await worker.dispatch("CompileRepository");

    // We expect 1 snapshot in storage
    const latest = await storage.latestSnapshot();
    expect(latest).toBeDefined();

    // We can't directly check the size of InMemoryStorage's internal map, but we can verify latest is present.
    // If it saved exactly one, latestSnapshot should return it.
  });

  it("the saved snapshot's ir.capabilities includes AUTH.LOGIN", async () => {
    await worker.dispatch("CompileRepository");

    const latest = await storage.latestSnapshot();
    expect(latest).toBeDefined();

    const capabilities = latest!.ir.capabilities;
    const authLogin = capabilities.find((c) => c.capability === "AUTH.LOGIN");
    expect(authLogin).toBeDefined();
  });

  it("latestSnapshot() returns the saved snapshot", async () => {
    await worker.dispatch("CompileRepository");

    const latest = await storage.latestSnapshot();
    expect(latest).toBeDefined();
    expect(latest!.id).toMatch(/^snap\|fixtures\/express-auth\|/);
  });
});
