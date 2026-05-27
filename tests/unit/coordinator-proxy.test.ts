import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// `auth()` is mocked per-test to simulate signed-in / signed-out state.
const authMock = vi.fn();
vi.mock("@/auth", () => ({
  auth: authMock,
}));

async function loadProxy() {
  // Re-import so each test sees the latest `process.env` values.
  return await import("@/app/api/coordinator/[...path]/route");
}

function makeRequest(method: string, url: string, init: RequestInit = {}): NextRequest {
  return new NextRequest(new Request(url, { method, ...init }));
}

function makeContext(path: string[]): { params: Promise<{ path: string[] }> } {
  return { params: Promise.resolve({ path }) };
}

describe("/api/coordinator/[...path] proxy", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.COORDINATOR_URL = "http://upstream.test";
    process.env.COORDINATOR_API_TOKEN = "server-token";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    authMock.mockReset();
    Object.assign(process.env, originalEnv);
    delete process.env.COORDINATOR_URL;
    delete process.env.COORDINATOR_API_TOKEN;
    delete process.env.VIBLY_COORDINATOR_NETWORK_PROFILES;
  });

  it("proxies unauthenticated GET without Authorization header", async () => {
    authMock.mockResolvedValue(null);
    const fetchMock = vi.fn(async () => Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await loadProxy();
    const response = await GET(makeRequest("GET", "http://console.test/api/coordinator/projects"), makeContext(["projects"]));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calls = fetchMock.mock.calls as unknown as Array<[URL, RequestInit]>;
    const [, init] = calls[0]!;
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("rejects unauthenticated POST with 401", async () => {
    authMock.mockResolvedValue(null);
    const fetchMock = vi.fn(async () => Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await loadProxy();
    const response = await POST(
      makeRequest("POST", "http://console.test/api/coordinator/action-intents", {
        body: JSON.stringify({ type: "Ping" }),
        headers: { "content-type": "application/json" },
      }),
      makeContext(["action-intents"]),
    );

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
    const body = (await response.json()) as { ok: boolean; error?: { code: string } };
    expect(body.ok).toBe(false);
    expect(body.error?.code).toBe("UNAUTHORIZED");
  });

  it("allows unauthenticated POST /wallet/challenges without Authorization header", async () => {
    authMock.mockResolvedValue(null);
    const fetchMock = vi.fn(async () => Response.json({ ok: true, data: { challenge: { id: "c1" } } }));
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await loadProxy();
    const response = await POST(
      makeRequest("POST", "http://console.test/api/coordinator/wallet/challenges", {
        body: JSON.stringify({ ecosystem: "polkadot", address: "5abc" }),
        headers: { "content-type": "application/json" },
      }),
      makeContext(["wallet", "challenges"]),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calls = fetchMock.mock.calls as unknown as Array<[URL, RequestInit]>;
    const [target, init] = calls[0]!;
    expect(target.toString()).toBe("http://upstream.test/wallet/challenges");
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("forwards authenticated GET requests with server-resolved Bearer token", async () => {
    authMock.mockResolvedValue({ user: { email: "u@test" } });
    const fetchMock = vi.fn(async () => Response.json({ ok: true, data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await loadProxy();
    const response = await GET(
      makeRequest("GET", "http://console.test/api/coordinator/projects?status=active"),
      makeContext(["projects"]),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calls = fetchMock.mock.calls as unknown as Array<[URL, RequestInit]>;
    const [target, init] = calls[0]!;
    expect(target.toString()).toBe("http://upstream.test/projects?status=active");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer server-token");
  });

  it("routes requests to the server-side coordinator configured for the selected network", async () => {
    process.env.VIBLY_COORDINATOR_NETWORK_PROFILES = JSON.stringify([
      { id: "local", coordinatorUrl: "http://local-coordinator.test", apiToken: "local-token" },
      { id: "testnet", coordinatorUrl: "http://testnet-coordinator.test:8788", apiToken: "testnet-token" },
    ]);
    authMock.mockResolvedValue({ user: { email: "u@test" } });
    const fetchMock = vi.fn(async () => Response.json({ ok: true, data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await loadProxy();
    const response = await GET(
      makeRequest("GET", "http://console.test/api/coordinator/projects", {
        headers: { "x-vibly-network-id": "testnet" },
      }),
      makeContext(["projects"]),
    );

    expect(response.status).toBe(200);
    const calls = fetchMock.mock.calls as unknown as Array<[URL, RequestInit]>;
    const [target, init] = calls[0]!;
    expect(target.toString()).toBe("http://testnet-coordinator.test:8788/projects");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer testnet-token");
    expect((init.headers as Record<string, string>)["X-Vibly-Network-Id"]).toBe("testnet");
  });

  it("uses the SSE network query key only for proxy routing", async () => {
    process.env.VIBLY_COORDINATOR_NETWORK_PROFILES = JSON.stringify([
      { id: "local", coordinatorUrl: "http://local-coordinator.test" },
      { id: "incentivized", coordinatorUrl: "http://incentivized-coordinator.test:8790" },
    ]);
    authMock.mockResolvedValue({ user: { email: "u@test" } });
    const fetchMock = vi.fn(async () => Response.json({ ok: true, data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await loadProxy();
    await GET(
      makeRequest("GET", "http://console.test/api/coordinator/projects?__networkId=incentivized&limit=10"),
      makeContext(["projects"]),
    );

    const calls = fetchMock.mock.calls as unknown as Array<[URL, RequestInit]>;
    const [target] = calls[0]!;
    expect(target.toString()).toBe("http://incentivized-coordinator.test:8790/projects?limit=10");
  });

  it("rejects an unknown selected network when coordinator profiles are configured", async () => {
    process.env.VIBLY_COORDINATOR_NETWORK_PROFILES = JSON.stringify([
      { id: "local", coordinatorUrl: "http://local-coordinator.test" },
    ]);
    authMock.mockResolvedValue({ user: { email: "u@test" } });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await loadProxy();
    const response = await GET(
      makeRequest("GET", "http://console.test/api/coordinator/projects", {
        headers: { "x-vibly-network-id": "missing" },
      }),
      makeContext(["projects"]),
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error?: { code: string } };
    expect(body.error?.code).toBe("COORDINATOR_NETWORK_NOT_CONFIGURED");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("strips legacy __apiToken / __coordinatorUrl query keys before forwarding", async () => {
    authMock.mockResolvedValue({ user: { email: "u@test" } });
    const fetchMock = vi.fn(async () => Response.json({ ok: true, data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await loadProxy();
    await GET(
      makeRequest(
        "GET",
        "http://console.test/api/coordinator/projects?__apiToken=evil&__coordinatorUrl=http%3A%2F%2Fattacker&status=active",
      ),
      makeContext(["projects"]),
    );

    const calls = fetchMock.mock.calls as unknown as Array<[URL, RequestInit]>;
    const [target, init] = calls[0]!;
    expect(target.toString()).toBe("http://upstream.test/projects?status=active");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer server-token");
    // The hostname of the upstream call must come from server env, never from a query string.
    expect(target.host).toBe("upstream.test");
  });

  it("forwards request body and method for POST requests", async () => {
    authMock.mockResolvedValue({ user: { email: "u@test" } });
    const fetchMock = vi.fn(async () => Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await loadProxy();
    await POST(
      makeRequest("POST", "http://console.test/api/coordinator/projects/p1/work", {
        body: JSON.stringify({ hello: "world" }),
        headers: { "content-type": "application/json" },
      }),
      makeContext(["projects", "p1", "work"]),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calls = fetchMock.mock.calls as unknown as Array<[URL, RequestInit]>;
    const [, init] = calls[0]!;
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"hello":"world"}');
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("forwards x-wallet-session header to upstream", async () => {
    authMock.mockResolvedValue(null);
    const fetchMock = vi.fn(async () => Response.json({ ok: true, data: { session: null } }));
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await loadProxy();
    await GET(
      makeRequest("GET", "http://console.test/api/coordinator/wallet/session", {
        headers: { "x-wallet-session": "ws_test_123" },
      }),
      makeContext(["wallet", "session"]),
    );

    const calls = fetchMock.mock.calls as unknown as Array<[URL, RequestInit]>;
    const [, init] = calls[0]!;
    expect((init.headers as Record<string, string>)["x-wallet-session"]).toBe("ws_test_123");
  });

  it("returns 503 when no Coordinator URL is configured", async () => {
    delete process.env.COORDINATOR_URL;
    delete process.env.NEXT_PUBLIC_COORDINATOR_URL;
    authMock.mockResolvedValue({ user: { email: "u@test" } });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await loadProxy();
    const response = await GET(makeRequest("GET", "http://console.test/api/coordinator/projects"), makeContext(["projects"]));

    expect(response.status).toBe(503);
    const body = (await response.json()) as { error?: { code: string } };
    expect(body.error?.code).toBe("COORDINATOR_NOT_CONFIGURED");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
