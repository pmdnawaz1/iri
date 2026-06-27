import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { buildServer } from "../../apps/compiler-api/src/index.js";
import { Worker } from "@rir/worker";

vi.mock("@rir/worker", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@rir/worker")>();
  return {
    ...actual,
    Worker: vi.fn().mockImplementation(() => {
      return {
        register: vi.fn().mockReturnThis(),
        dispatch: vi.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

describe("POST /compile/repository", () => {
  let app: ReturnType<typeof buildServer>;

  beforeAll(() => {
    app = buildServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 400 if dir is missing", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/compile/repository",
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "bad request" });
  });

  it("returns 400 if dir doesn't exist", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/compile/repository",
      payload: { dir: "/does/not/exist/ever" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "bad request" });
  });

  it("returns 202 Accepted and queues the job for an existing directory", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/compile/repository",
      payload: { dir: process.cwd() },
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ status: "queued", dir: process.cwd() });
    
    // We mocked the Worker, so the dispatch should have been called (though it's fire-and-forget).
    // The test just asserts the 202 status code and the body as requested.
  });
});
