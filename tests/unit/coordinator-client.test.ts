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
    const fetchMock = vi.fn(async (_input: Request | string | URL) =>
      Response.json({
        ok: true,
        data: [{ id: "project_1", name: "Demo" }],
        page: { limit: 50, nextCursor: null },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = createCoordinatorClient(auth);
    await expect(client.listProjects()).resolves.toMatchObject({
      data: [{ id: "project_1" }],
      page: { nextCursor: null },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calls = fetchMock.mock.calls as unknown as Array<[Request]>;
    const request = calls[0]?.[0];
    expect(request?.url).toBe("http://coordinator.test/projects");
    expect(request?.headers.get("Authorization")).toBe("Bearer dev-token");
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
    const fetchMock = vi.fn(async () =>
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
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = createCoordinatorClient(auth);
    const result = await client.listGovernanceMerged("project_1", { limit: 100 });
    expect(result.data[0].subject).toMatchObject({ backend: "evm-governor" });
    const request = (fetchMock.mock.calls as unknown as Array<[Request]>)[0]?.[0];
    expect(request?.url).toContain("/governance/merged");
    expect(request?.url).toContain("projectId=project_1");
    expect(request?.url).toContain("limit=100");
  });

  it("passes backend filter to governance merged reads", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        ok: true,
        data: { items: [] },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = createCoordinatorClient(auth);
    await client.listGovernanceMerged("project_1", { backend: "evm-governor", limit: 50 });
    const request = (fetchMock.mock.calls as unknown as Array<[Request]>)[0]?.[0];
    expect(request?.url).toContain("/governance/merged");
    expect(request?.url).toContain("projectId=project_1");
    expect(request?.url).toContain("backend=evm-governor");
    expect(request?.url).toContain("limit=50");
  });

  it("loads governance backend descriptors and capabilities", async () => {
    const fetchMock = vi.fn(async () =>
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
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = createCoordinatorClient(auth);
    const result = await client.listGovernanceBackends();
    expect(result.data[0]).toMatchObject({
      backend: "evm-governor",
      health: expect.objectContaining({ status: "healthy" }),
      capabilities: expect.objectContaining({ readVotes: true, requiresWallet: true }),
    });
    const request = (fetchMock.mock.calls as unknown as Array<[Request]>)[0]?.[0];
    expect(request?.url).toBe("http://coordinator.test/governance/backends");
  });

  it("loads project overview and timeline read models", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: Request | string) => {
        const url = typeof input === "string" ? input : input.url;
        if (url.includes("/timeline")) {
          return Response.json({ ok: true, data: { timeline: [{ id: "step_1", phase: "observe" }] } });
        }
        return Response.json({ ok: true, data: { overview: { counts: { timelineEvents: 2 } } } });
      }),
    );
    const client = createCoordinatorClient(auth);
    await expect(client.getProjectOverview("project_1")).resolves.toMatchObject({ counts: { timelineEvents: 2 } });
    await expect(client.listProjectTimeline("project_1")).resolves.toMatchObject({ data: [{ id: "step_1", phase: "observe" }] });
    const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls as Array<[Request]>;
    const urls = calls.map((c) => c[0]?.url);
    expect(urls).toContain("http://coordinator.test/projects/project_1/overview");
    expect(urls).toContain("http://coordinator.test/projects/project_1/timeline");
  });

  it("loads incentive-risk scenario, overview, runs, reputation, and slash read models", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: Request | string) => {
        const url = typeof input === "string" ? input : input.url;
        if (url.endsWith("/dev/scenarios/incentive-risk/runs") && (typeof input === "object" ? input.method === "POST" : false)) {
          return Response.json({ ok: true, data: { run: { id: "phase_h_1" } } });
        }
        if (url.includes("/dev/scenarios/incentive-risk/runs")) return Response.json({ ok: true, data: [{ id: "phase_h_1" }], page: { limit: 50, nextCursor: null } });
        if (url.includes("/overview")) return Response.json({ ok: true, data: { overview: { counts: { claimableRewards: 1 } } } });
        if (url.includes("/reputation/evidence")) return Response.json({ ok: true, data: [{ id: "rep_1" }], page: { limit: 50, nextCursor: null } });
        return Response.json({ ok: true, data: [{ id: "slash_1" }], page: { limit: 50, nextCursor: null } });
      }),
    );
    const client = createCoordinatorClient(auth);
    await expect(client.runIncentiveRiskScenario()).resolves.toMatchObject({ id: "phase_h_1" });
    await expect(client.getProjectOverview("project_1")).resolves.toMatchObject({ counts: { claimableRewards: 1 } });
    await expect(client.listIncentiveRiskScenarioRuns({ projectId: "project_1", limit: 100 })).resolves.toMatchObject({ data: [{ id: "phase_h_1" }] });
    await expect(client.listReputationEvidence("project_1")).resolves.toMatchObject({ data: [{ id: "rep_1" }] });
    await expect(client.listSlashRequests("project_1", { limit: 100 })).resolves.toMatchObject({ data: [{ id: "slash_1" }] });
  });

  it("streams project events through the console proxy without URL credentials", () => {
    const close = vi.fn();
    const addEventListener = vi.fn();
    const eventSource = vi.fn(function EventSourceMock(this: { addEventListener: typeof addEventListener; close: typeof close; onerror?: () => void }) {
      this.addEventListener = addEventListener;
      this.close = close;
    });
    vi.stubGlobal("EventSource", eventSource);
    const client = createCoordinatorClient(auth);
    const unsubscribe = client.streamProjectEvents("project_1", { onEvent: vi.fn(), onStatus: vi.fn() });
    // Bearer token / coordinator URL must never enter the SSE URL: the
    // proxy resolves credentials server-side from the Auth.js session.
    expect(eventSource).toHaveBeenCalledWith("/api/coordinator/projects/project_1/stream");
    const calls = eventSource.mock.calls as unknown as Array<[string]>;
    const callArg = calls[0]?.[0] ?? "";
    expect(callArg).not.toContain("__apiToken");
    expect(callArg).not.toContain("__coordinatorUrl");
    expect(addEventListener).toHaveBeenCalledWith("ProjectEvent", expect.any(Function));
    unsubscribe();
    expect(close).toHaveBeenCalled();
  });

  it("adds only the selected network id to stream proxy URLs", () => {
    const close = vi.fn();
    const addEventListener = vi.fn();
    const eventSource = vi.fn(function EventSourceMock(this: { addEventListener: typeof addEventListener; close: typeof close; onerror?: () => void }) {
      this.addEventListener = addEventListener;
      this.close = close;
    });
    vi.stubGlobal("EventSource", eventSource);
    const client = createCoordinatorClient(auth, "substrate:vibly-testnet");
    const unsubscribe = client.streamProjectEvents("project_1", { onEvent: vi.fn() });

    expect(eventSource).toHaveBeenCalledWith("/api/coordinator/projects/project_1/stream?__networkId=substrate%3Avibly-testnet");
    const calls = eventSource.mock.calls as unknown as Array<[string]>;
    expect(calls[0]?.[0]).not.toContain("__apiToken");
    expect(calls[0]?.[0]).not.toContain("__coordinatorUrl");
    unsubscribe();
  });


  it("uses feedEventId routes for feed details", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        ok: true,
        data: {
          feedItem: {
            feedEventId: "feed_1",
            eventType: "ProposalCreated",
          },
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = createCoordinatorClient(auth);

    await expect(client.getFeedEvent("feed_1")).resolves.toMatchObject({ feedEventId: "feed_1" });
    const request = (fetchMock.mock.calls as unknown as Array<[Request]>)[0]?.[0];
    expect(request?.url).toBe("http://coordinator.test/feed/feed_1");
  });

  it("loads agent profiles from /agent-profiles", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        ok: true,
        data: {
          items: [
            {
              principalId: "agent_1",
              displayName: "Research Agent",
              stakeLedger: { status: "active", activeAmount: "100" },
            },
          ],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = createCoordinatorClient(auth);

    await expect(client.listAgentProfiles({ limit: 25 })).resolves.toMatchObject({
      data: [{ principalId: "agent_1" }],
      page: { limit: 25, nextCursor: null },
    });
    const request = (fetchMock.mock.calls as unknown as Array<[Request]>)[0]?.[0];
    expect(request?.url).toBe("http://coordinator.test/agent-profiles?limit=25");
  });
});
