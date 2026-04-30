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

  it("loads governance merged views through coordinator", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          ok: true,
          data: {
            items: [
              {
                id: "merged:eip155:31337:prop_evm_1",
                subject: { backend: "evm-governor", externalId: "prop_evm_1" },
                freshness: { stale: false },
              },
            ],
          },
        }),
      ),
    );
    const client = createCoordinatorClient(auth);
    const result = await client.listGovernanceMerged("project_1", { limit: 100 });
    expect(result.data[0].subject).toMatchObject({ backend: "evm-governor" });
    expect(fetch).toHaveBeenCalledWith(
      "http://coordinator.test/governance/merged?projectId=project_1&limit=100",
      expect.anything(),
    );
  });

  it("loads governance backend descriptors and capabilities", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          ok: true,
          data: {
            backends: [
              {
                id: "eip155:31337",
                backend: "evm-governor",
                capabilities: { readSubjects: true, readVotes: true, checkpoint: true, requiresWallet: true },
              },
            ],
          },
        }),
      ),
    );
    const client = createCoordinatorClient(auth);
    const result = await client.listGovernanceBackends();
    expect(result.data[0]).toMatchObject({
      backend: "evm-governor",
      capabilities: expect.objectContaining({ readVotes: true, requiresWallet: true }),
    });
    expect(fetch).toHaveBeenCalledWith("http://coordinator.test/governance/backends", expect.anything());
  });
});
