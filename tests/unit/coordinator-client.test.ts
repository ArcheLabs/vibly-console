import { afterEach, describe, expect, it, vi } from "vitest";
import { createCoordinatorClient } from "@/lib/coordinator/client";
import { ConsoleApiError } from "@/lib/coordinator/errors";
import type { AuthState } from "@/lib/coordinator/types";

const auth: AuthState = {
  coordinatorUrl: "http://coordinator.test",
  apiToken: "dev-token",
  mode: "direct",
  connected: true,
};

describe("CoordinatorClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("unwraps list responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          ok: true,
          data: [{ id: "project_1", name: "Demo" }],
          page: { limit: 50, nextCursor: null },
        }),
      ),
    );
    const client = createCoordinatorClient(auth);
    await expect(client.listProjects()).resolves.toMatchObject({
      data: [{ id: "project_1" }],
      page: { nextCursor: null },
    });
    expect(fetch).toHaveBeenCalledWith(
      "http://coordinator.test/projects",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer dev-token" }) }),
    );
  });

  it("normalizes API errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { ok: false, error: { code: "UNAUTHORIZED", message: "Invalid API token" } },
          { status: 401 },
        ),
      ),
    );
    const client = createCoordinatorClient(auth);
    await expect(client.listProjects()).rejects.toBeInstanceOf(ConsoleApiError);
  });
});
