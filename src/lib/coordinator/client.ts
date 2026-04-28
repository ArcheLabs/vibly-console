import { ConsoleApiError } from "./errors";
import type { AuthState, Entity, EventEnvelope, Page, PageInput } from "./types";

type RequestBody = Record<string, unknown> | unknown[] | undefined;

export interface CoordinatorClient {
  health(): Promise<Entity>;
  listProjects(input?: PageInput): Promise<Page<Entity>>;
  getProject(projectId: string): Promise<Entity>;
  listObjectives(projectId: string, input?: PageInput): Promise<Page<Entity>>;
  getBoundary(projectId: string): Promise<Entity | null>;
  evaluateBoundary(projectId: string, body: Record<string, unknown>): Promise<Entity>;
  listPrincipals(input?: PageInput): Promise<Page<Entity>>;
  listAgents(input?: PageInput): Promise<Page<Entity>>;
  listRuntimeBindings(agentId: string): Promise<Page<Entity>>;
  getLatestState(projectId: string): Promise<Entity | null>;
  rebuildState(projectId: string, knowledgeVersionId: string): Promise<Entity>;
  getLatestKnowledge(projectId: string): Promise<Entity | null>;
  listKnowledgeVersions(input?: PageInput): Promise<Page<Entity>>;
  listKnowledgeCandidates(input?: PageInput): Promise<Page<Entity>>;
  listExternalInputs(projectId: string): Promise<Page<Entity>>;
  listObservations(projectId: string, input?: PageInput): Promise<Page<Entity>>;
  listAssignments(projectId: string, input?: PageInput): Promise<Page<Entity>>;
  listLeases(projectId: string): Promise<Page<Entity>>;
  sweepLeases(): Promise<Entity>;
  listActions(projectId: string, input?: PageInput): Promise<Page<Entity>>;
  getAction(actionId: string): Promise<Entity>;
  evaluateAction(actionId: string, body: Record<string, unknown>): Promise<Entity>;
  listNegotiations(input?: PageInput): Promise<Page<Entity>>;
  getNegotiation(negotiationId: string): Promise<Entity>;
  submitPosition(negotiationId: string, body: Record<string, unknown>): Promise<Entity>;
  closeNegotiation(negotiationId: string): Promise<Entity>;
  listWorkOrders(projectId: string, input?: PageInput): Promise<Page<Entity>>;
  getWorkOrder(workOrderId: string): Promise<Entity>;
  cancelWorkOrder(workOrderId: string, reason: string): Promise<Entity>;
  listReviews(input?: PageInput): Promise<Page<Entity>>;
  submitReview(body: Record<string, unknown>): Promise<Entity>;
  aggregateReviews(body: Record<string, unknown>): Promise<Entity>;
  listRewards(projectId: string, input?: PageInput): Promise<Page<Entity>>;
  reserveReward(rewardIntentId: string): Promise<Entity>;
  claimReward(rewardIntentId: string, actorId: string): Promise<Entity>;
  getLedger(): Promise<Entity>;
  listReputationEvidence(projectId: string): Promise<Page<Entity>>;
  listGovernanceIntents(projectId: string): Promise<Page<Entity>>;
  submitMockGovernance(governanceIntentId: string): Promise<Entity>;
  listHumanRequests(projectId: string): Promise<Page<Entity>>;
  submitGuardianDecision(body: Record<string, unknown>): Promise<Entity>;
  listTraces(input?: PageInput): Promise<Page<Entity>>;
  getTrace(traceId: string): Promise<Entity>;
  createTrace(projectId: string, body?: Record<string, unknown>): Promise<Entity>;
  verifyTrace(traceId: string): Promise<Entity>;
  replayTrace(traceId: string): Promise<Entity>;
  listEvents(input?: PageInput): Promise<Page<EventEnvelope>>;
  streamProjectEvents(projectId: string, handlers: StreamHandlers): () => void;
}

export interface StreamHandlers {
  onEvent(event: EventEnvelope): void;
  onStatus?(status: "connected" | "disconnected" | "error"): void;
}

export function createCoordinatorClient(auth: AuthState): CoordinatorClient {
  return new HttpCoordinatorClient(auth);
}

class HttpCoordinatorClient implements CoordinatorClient {
  constructor(private readonly auth: AuthState) {}

  health() {
    return this.request<Entity>("/health");
  }

  listProjects(input?: PageInput) {
    return this.requestPage<Entity>("/projects", input);
  }

  async getProject(projectId: string) {
    return unwrapKey<Entity>(await this.request<Entity>(`/projects/${projectId}`), "project");
  }

  listObjectives(projectId: string, input?: PageInput) {
    return this.requestPage<Entity>(`/projects/${projectId}/objectives`, input);
  }

  async getBoundary(projectId: string) {
    try {
      return unwrapKey<Entity>(await this.request<Entity>(`/projects/${projectId}/boundary`), "boundary");
    } catch (error) {
      if (error instanceof ConsoleApiError && error.status === 404) return null;
      throw error;
    }
  }

  async evaluateBoundary(projectId: string, body: Record<string, unknown>) {
    return unwrapKey<Entity>(await this.request<Entity>(`/projects/${projectId}/boundary/evaluate`, { method: "POST", body }), "evaluation");
  }

  listPrincipals(input?: PageInput) {
    return this.requestPage<Entity>("/principals", input);
  }

  listAgents(input?: PageInput) {
    return this.requestPage<Entity>("/agents", input);
  }

  async listRuntimeBindings(agentId: string) {
    const payload = await this.request<Entity>(`/agents/${agentId}/runtime-bindings`);
    return toPage<Entity>(extractArray(payload, "runtimeBindings") as Entity[]);
  }

  async getLatestState(projectId: string) {
    try {
      return unwrapKey<Entity>(await this.request<Entity>(`/projects/${projectId}/state/latest`), "stateView");
    } catch (error) {
      if (error instanceof ConsoleApiError && error.status === 404) return null;
      throw error;
    }
  }

  async rebuildState(projectId: string, knowledgeVersionId: string) {
    return unwrapKey<Entity>(
      await this.request<Entity>(`/projects/${projectId}/state/rebuild`, { method: "POST", body: { knowledgeVersionId } }),
      "stateView",
    );
  }

  async getLatestKnowledge(_projectId: string) {
    try {
      return unwrapKey<Entity>(await this.request<Entity>("/knowledge/latest"), "knowledgeVersion");
    } catch (error) {
      if (error instanceof ConsoleApiError && error.status === 404) return null;
      throw error;
    }
  }

  listKnowledgeVersions(input?: PageInput) {
    return this.requestPage<Entity>("/knowledge/versions", input);
  }

  async listKnowledgeCandidates(input?: PageInput) {
    const events = await this.listEvents({ ...input, type: "KnowledgeCandidateProposed" });
    return toPage<Entity>(events.data.map((event) => objectPayload(event)));
  }

  async listExternalInputs(projectId: string) {
    const events = await this.listEvents({ type: "ExternalInputSubmitted", limit: 100 });
    return toPage<Entity>(events.data.map((event) => objectPayload(event)).filter((item) => item.projectId === projectId || item.projectId === undefined));
  }

  listObservations(projectId: string, input?: PageInput) {
    return this.requestPage<Entity>(`/projects/${projectId}/observations`, input);
  }

  listAssignments(projectId: string, input?: PageInput) {
    return this.requestPage<Entity>(`/projects/${projectId}/assignments`, input);
  }

  async listLeases(projectId: string) {
    const assignments = await this.listAssignments(projectId, { limit: 200 });
    return toPage<Entity>(
      assignments.data
        .filter((assignment) => assignment.leaseId)
        .map((assignment) => ({
          id: assignment.leaseId,
          kind: `role:${assignment.role ?? "unknown"}`,
          resourceId: projectId,
          holderId: assignment.actorId,
          status: "active",
          source: "assignment_projection",
        })),
    );
  }

  async sweepLeases() {
    return this.request<Entity>("/leases/sweep", { method: "POST" });
  }

  listActions(projectId: string, input?: PageInput) {
    return this.requestPage<Entity>(`/projects/${projectId}/actions`, input);
  }

  async getAction(actionId: string) {
    return unwrapKey<Entity>(await this.request<Entity>(`/actions/${actionId}`), "action");
  }

  async evaluateAction(actionId: string, body: Record<string, unknown>) {
    return unwrapKey<Entity>(await this.request<Entity>(`/actions/${actionId}/evaluate`, { method: "POST", body }), "policyDecision");
  }

  listNegotiations(input?: PageInput) {
    return this.requestPage<Entity>("/negotiations", input);
  }

  async getNegotiation(negotiationId: string) {
    return unwrapKey<Entity>(await this.request<Entity>(`/negotiations/${negotiationId}`), "negotiation");
  }

  async submitPosition(negotiationId: string, body: Record<string, unknown>) {
    return unwrapKey<Entity>(await this.request<Entity>(`/negotiations/${negotiationId}/positions`, { method: "POST", body }), "negotiation");
  }

  async closeNegotiation(negotiationId: string) {
    return unwrapKey<Entity>(await this.request<Entity>(`/negotiations/${negotiationId}/close`, { method: "POST", body: { source: "console" } }), "decisionRecord");
  }

  listWorkOrders(projectId: string, input?: PageInput) {
    return this.requestPage<Entity>("/work-orders/open", { ...input, projectId });
  }

  async getWorkOrder(workOrderId: string) {
    return unwrapKey<Entity>(await this.request<Entity>(`/work-orders/${workOrderId}`), "workOrder");
  }

  cancelWorkOrder(workOrderId: string, reason: string) {
    return this.request<Entity>(`/work-orders/${workOrderId}/cancel`, { method: "POST", body: { reason } });
  }

  listReviews(input?: PageInput) {
    return this.requestPage<Entity>("/reviews", input);
  }

  async submitReview(body: Record<string, unknown>) {
    return unwrapKey<Entity>(await this.request<Entity>("/reviews", { method: "POST", body }), "review");
  }

  async aggregateReviews(body: Record<string, unknown>) {
    return unwrapKey<Entity>(await this.request<Entity>("/reviews/aggregate", { method: "POST", body }), "aggregation");
  }

  listRewards(projectId: string, input?: PageInput) {
    return this.requestPage<Entity>("/rewards", { ...input, projectId });
  }

  async reserveReward(rewardIntentId: string) {
    return unwrapKey<Entity>(await this.request<Entity>(`/rewards/${rewardIntentId}/reserve`, { method: "POST" }), "rewardIntent");
  }

  async claimReward(rewardIntentId: string, actorId: string) {
    return unwrapKey<Entity>(await this.request<Entity>(`/rewards/${rewardIntentId}/claim`, { method: "POST", body: { actorId } }), "rewardIntent");
  }

  getLedger() {
    return this.request<Entity>("/ledger");
  }

  async listReputationEvidence(projectId: string) {
    const events = await this.listEvents({ limit: 100 });
    const evidence = events.data
      .filter((event) => event.type === "ReputationEvidenceCreated")
      .map((event) => objectPayload(event))
      .filter((item) => item.projectId === projectId || item.projectId === undefined);
    return toPage<Entity>(evidence);
  }

  async listGovernanceIntents(projectId: string) {
    const events = await this.listEvents({ type: "GovernanceIntentCreated", limit: 100 });
    return toPage<Entity>(events.data.map((event) => objectPayload(event)).filter((item) => item.projectId === projectId));
  }

  async submitMockGovernance(governanceIntentId: string) {
    return unwrapKey<Entity>(
      await this.request<Entity>(`/governance/intents/${governanceIntentId}/submit-mock`, { method: "POST" }),
      "governanceIntent",
    );
  }

  async listHumanRequests(projectId: string) {
    const events = await this.listEvents({ limit: 100 });
    const requests = events.data
      .filter((event) => ["HumanRequestCreated", "GuardianRequestCreated", "EmergencyRequestCreated"].includes(event.type))
      .map((event) => objectPayload(event))
      .filter((item) => item.projectId === projectId || item.projectId === undefined);
    return toPage<Entity>(requests);
  }

  async submitGuardianDecision(_body: Record<string, unknown>): Promise<Entity> {
    throw new ConsoleApiError({
      code: "UNSUPPORTED",
      message: "Guardian decision API is not available in the current coordinator.",
      status: 501,
    });
  }

  listTraces(input?: PageInput) {
    return this.requestPage<Entity>("/traces", input);
  }

  async getTrace(traceId: string) {
    return unwrapKey<Entity>(await this.request<Entity>(`/traces/${traceId}`), "trace");
  }

  async createTrace(projectId: string, body?: Record<string, unknown>) {
    return unwrapKey<Entity>(await this.request<Entity>(`/projects/${projectId}/traces`, { method: "POST", body: body ?? {} }), "trace");
  }

  verifyTrace(traceId: string) {
    return this.request<Entity>(`/traces/${traceId}/verify`, { method: "POST" });
  }

  replayTrace(traceId: string) {
    return this.request<Entity>(`/traces/${traceId}/replay`, { method: "POST" });
  }

  listEvents(input?: PageInput) {
    return this.requestPage<EventEnvelope>("/events", input);
  }

  streamProjectEvents(projectId: string, handlers: StreamHandlers) {
    const url = this.makeUrl(`/projects/${projectId}/stream`);
    const eventSource = new EventSource(url);
    handlers.onStatus?.("connected");
    const handleMessage = (event: MessageEvent) => {
      try {
        handlers.onEvent(JSON.parse(event.data) as EventEnvelope);
      } catch {
        // Ignore malformed stream frames.
      }
    };
    eventSource.addEventListener("ProjectEvent", handleMessage);
    eventSource.onerror = () => handlers.onStatus?.("error");
    return () => {
      eventSource.close();
      handlers.onStatus?.("disconnected");
    };
  }

  private async requestPage<T>(path: string, input?: PageInput): Promise<Page<T>> {
    const response = await this.request<unknown[]>(path, { query: input });
    if (Array.isArray(response)) return toPage<T>(response as T[]);
    return toPage<T>(extractArray(response) as T[]);
  }

  private async request<T>(path: string, options: { method?: string; body?: RequestBody; query?: PageInput } = {}): Promise<T> {
    const response = await fetch(this.makeUrl(path, options.query), {
      method: options.method ?? "GET",
      headers: this.headers(options.body),
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json") ? ((await response.json()) as unknown) : await response.text();
    if (!response.ok) {
      const failure = payload && typeof payload === "object" ? (payload as { error?: { code?: string; message?: string; details?: unknown } }) : {};
      throw new ConsoleApiError({
        code: failure.error?.code ?? `HTTP_${response.status}`,
        message: failure.error?.message ?? response.statusText,
        status: response.status,
        details: failure.error?.details ?? payload,
      });
    }
    if (payload && typeof payload === "object" && "ok" in payload) {
      const envelope = payload as { ok: boolean; data?: unknown; page?: Page<unknown>["page"]; error?: { code?: string; message?: string; details?: unknown } };
      if (!envelope.ok) {
        throw new ConsoleApiError({
          code: envelope.error?.code ?? "API_ERROR",
          message: envelope.error?.message ?? "Coordinator returned an error",
          details: envelope.error?.details,
        });
      }
      if (Array.isArray(envelope.data)) return { data: envelope.data, page: envelope.page ?? { limit: envelope.data.length, nextCursor: null } } as T;
      return envelope.data as T;
    }
    return payload as T;
  }

  private makeUrl(path: string, query?: PageInput): string {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const base = this.auth.mode === "proxy" ? "/api/coordinator" : this.auth.coordinatorUrl.replace(/\/$/, "");
    const url = new URL(`${base}${cleanPath}`, typeof window === "undefined" ? "http://localhost:3000" : window.location.origin);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
    }
    if (this.auth.mode === "proxy") {
      url.searchParams.set("__coordinatorUrl", this.auth.coordinatorUrl);
      if (this.auth.apiToken) url.searchParams.set("__apiToken", this.auth.apiToken);
    }
    return this.auth.mode === "proxy" ? `${url.pathname}${url.search}` : url.toString();
  }

  private headers(body: RequestBody): HeadersInit {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (this.auth.mode === "direct" && this.auth.apiToken) headers.Authorization = `Bearer ${this.auth.apiToken}`;
    return headers;
  }
}

function unwrapKey<T extends Entity>(value: unknown, key: string): T {
  if (value && typeof value === "object" && key in value) return (value as Record<string, T>)[key];
  return value as T;
}

function extractArray(value: unknown, preferredKey?: string): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  if (preferredKey && Array.isArray(record[preferredKey])) return record[preferredKey] as unknown[];
  for (const item of Object.values(record)) {
    if (Array.isArray(item)) return item;
  }
  return [];
}

function toPage<T>(data: T[]): Page<T> {
  return { data, page: { limit: data.length, nextCursor: null } };
}

function objectPayload(event: EventEnvelope): Entity {
  return event.payload && typeof event.payload === "object" ? (event.payload as Entity) : { payload: event.payload };
}
