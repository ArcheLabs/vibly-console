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

  it("passes backend filter to governance merged reads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          ok: true,
          data: { items: [] },
        }),
      ),
    );
    const client = createCoordinatorClient(auth);
    await client.listGovernanceMerged("project_1", { backend: "evm-governor", limit: 50 });
    expect(fetch).toHaveBeenCalledWith(
      "http://coordinator.test/governance/merged?projectId=project_1&backend=evm-governor&limit=50",
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
                id: "evm-fixture",
                backend: "evm-governor",
                health: { status: "healthy", stale: false, lastObservedAt: "2026-01-01T00:00:00Z" },
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
      health: expect.objectContaining({ status: "healthy" }),
      capabilities: expect.objectContaining({ readVotes: true, requiresWallet: true }),
    });
    expect(fetch).toHaveBeenCalledWith("http://coordinator.test/governance/backends", expect.anything());
  });

  it("loads Phase G overview and timeline read models", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/phase-g/overview")) {
          return Response.json({ ok: true, data: { overview: { counts: { timelineEvents: 2 } } } });
        }
        return Response.json({ ok: true, data: { timeline: [{ id: "step_1", phase: "observe" }] } });
      }),
    );
    const client = createCoordinatorClient(auth);
    await expect(client.getPhaseGOverview("project_1")).resolves.toMatchObject({ counts: { timelineEvents: 2 } });
    await expect(client.listPhaseGTimeline("project_1")).resolves.toMatchObject({ data: [{ id: "step_1", phase: "observe" }] });
    expect(fetch).toHaveBeenCalledWith("http://coordinator.test/projects/project_1/phase-g/overview", expect.anything());
    expect(fetch).toHaveBeenCalledWith("http://coordinator.test/projects/project_1/phase-g/timeline", expect.anything());
  });

  it("loads Phase H smoke, overview, runs, reputation, and slash read models", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith("/phase-h/smoke")) return Response.json({ ok: true, data: { run: { id: "phase_h_1" } } });
        if (url.includes("/phase-h/overview")) return Response.json({ ok: true, data: { overview: { counts: { claimableRewards: 1 } } } });
        if (url.includes("/phase-h/runs")) return Response.json({ ok: true, data: [{ id: "phase_h_1" }] });
        if (url.includes("/reputation/evidence")) return Response.json({ ok: true, data: [{ id: "rep_1" }] });
        return Response.json({ ok: true, data: [{ id: "slash_1" }] });
      }),
    );
    const client = createCoordinatorClient(auth);
    await expect(client.runPhaseHSmoke()).resolves.toMatchObject({ id: "phase_h_1" });
    await expect(client.getPhaseHOverview("project_1")).resolves.toMatchObject({ counts: { claimableRewards: 1 } });
    await expect(client.listPhaseHRuns({ projectId: "project_1", limit: 100 })).resolves.toMatchObject({ data: [{ id: "phase_h_1" }] });
    await expect(client.listReputationEvidence("project_1")).resolves.toMatchObject({ data: [{ id: "rep_1" }] });
    await expect(client.listSlashRequests("project_1", { limit: 100 })).resolves.toMatchObject({ data: [{ id: "slash_1" }] });
  });

  it("streams project events through the console proxy", () => {
    const close = vi.fn();
    const addEventListener = vi.fn();
    const eventSource = vi.fn(function EventSourceMock(this: { addEventListener: typeof addEventListener; close: typeof close; onerror?: () => void }) {
      this.addEventListener = addEventListener;
      this.close = close;
    });
    vi.stubGlobal("EventSource", eventSource);
    const client = createCoordinatorClient(auth);
    const unsubscribe = client.streamProjectEvents("project_1", { onEvent: vi.fn(), onStatus: vi.fn() });
    expect(eventSource).toHaveBeenCalledWith("/api/coordinator/projects/project_1/stream?__coordinatorUrl=http%3A%2F%2Fcoordinator.test&__apiToken=dev-token");
    expect(addEventListener).toHaveBeenCalledWith("ProjectEvent", expect.any(Function));
    unsubscribe();
    expect(close).toHaveBeenCalled();
  });
});
