import { unwrapEnvelope, unwrapListEnvelope } from "@vibly/coordinator-http-contract/client";
import { CoordinatorApiError as ContractApiError } from "@vibly/coordinator-http-contract/errors";
import { ConsoleApiError } from "./errors";
import type { AuthState, Entity, EventEnvelope, Page, PageInput } from "./types";
import { createConsoleContractClient, type ConsoleContractClient } from "./contractClient";

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
  listGovernanceSubjects(input?: PageInput): Promise<Page<Entity>>;
  getGovernanceSubject(subjectId: string): Promise<Entity>;
  listGovernanceSubjectVotes(subjectId: string): Promise<Page<Entity>>;
  listGovernanceDelegations(input?: PageInput): Promise<Page<Entity>>;
  listGovernanceMerged(projectId?: string, input?: PageInput): Promise<Page<Entity>>;
  getGovernanceMerged(id: string): Promise<Entity>;
  linkGovernanceIntent(intentId: string, body: Record<string, unknown>): Promise<Entity>;
  submitGovernanceOpenGov(intentId: string, body: Record<string, unknown>): Promise<Entity>;
  reconcileGovernanceSubject(intentId: string, body: Record<string, unknown>): Promise<Entity>;
  submitGovernanceVoteOpenGov(subjectId: string, body: Record<string, unknown>): Promise<Entity>;
  getGovernanceCheckpointView(): Promise<Entity>;
  listGovernanceBackends(): Promise<Page<Entity>>;
  listHumanRequests(projectId: string): Promise<Page<Entity>>;
  runAgentCollaborationScenario(): Promise<Entity>;
  listAgentCollaborationScenarioRuns(input?: PageInput): Promise<Page<Entity>>;
  listGuardianRequests(projectId?: string, input?: PageInput): Promise<Page<Entity>>;
  getProjectOverview(projectId: string): Promise<Entity>;
  listProjectTimeline(projectId: string): Promise<Page<Entity>>;
  runIncentiveRiskScenario(): Promise<Entity>;
  listIncentiveRiskScenarioRuns(input?: PageInput): Promise<Page<Entity>>;
  listSlashRequests(projectId?: string, input?: PageInput): Promise<Page<Entity>>;
  submitGuardianDecision(body: Record<string, unknown>): Promise<Entity>;
  listTraces(input?: PageInput): Promise<Page<Entity>>;
  getTrace(traceId: string): Promise<Entity>;
  createTrace(projectId: string, body?: Record<string, unknown>): Promise<Entity>;
  verifyTrace(traceId: string): Promise<Entity>;
  replayTrace(traceId: string): Promise<Entity>;
  listEvents(input?: PageInput): Promise<Page<EventEnvelope>>;
  streamProjectEvents(projectId: string, handlers: StreamHandlers): () => void;

  // V0.2: Network Feed (backed by /events until /feed is in contract)
  getNetworkFeed(limit?: number): Promise<Page<Entity>>;
  getFeedEvent(eventId: string): Promise<Entity>;

  // V0.2: Organizations (backed by /projects until /organizations is in contract)
  getNetworkOrganizations(limit?: number): Promise<Page<Entity>>;
  getNetworkOrganization(orgId: string): Promise<Entity>;
  getOrganizationFeed(orgId: string, limit?: number): Promise<Page<Entity>>;

  // V0.2: Agents (uses existing /agents endpoints)
  getNetworkAgent(agentId: string): Promise<Entity>;
  getAgentReputation(agentId: string): Promise<Entity>;

  // V0.2: Domain objects
  getObservationV2(observationId: string): Promise<Entity>;
  getProposalV2(proposalId: string): Promise<Entity>;
  getVotingRoundV2(votingRoundId: string): Promise<Entity>;
  getMechanismV2(mechanismId: string): Promise<Entity>;
  getTaskV2(taskId: string): Promise<Entity>;
  getArtifactV2(artifactId: string): Promise<Entity>;
  getDiscussionV2(discussionId: string): Promise<Entity>;

  // V0.2: Human ActionIntent
  submitActionIntent(body: Record<string, unknown>): Promise<Entity>;

  createAirdropPayload(body: Record<string, unknown>): Promise<Entity>;
  submitAirdropClaim(body: Record<string, unknown>): Promise<Entity>;
  getAirdropStatus(evmAddress: string): Promise<Entity>;
  createRootRotationPayload(body: Record<string, unknown>): Promise<Entity>;
  submitRootRotation(body: Record<string, unknown>): Promise<Entity>;
  getIdentityByEvm(evmAddress: string): Promise<Entity>;
  quoteDotVib(body: Record<string, unknown>): Promise<Entity>;
  createDotVibOrder(body: Record<string, unknown>): Promise<Entity>;
  getDotVibOrder(orderId: string): Promise<Entity>;
}

export interface StreamHandlers {
  onEvent(event: EventEnvelope): void;
  onStatus?(status: "connected" | "disconnected" | "error"): void;
}

export function createCoordinatorClient(auth: AuthState): CoordinatorClient {
  return new HttpCoordinatorClient(auth);
}

class HttpCoordinatorClient implements CoordinatorClient {
  private readonly contract: ConsoleContractClient;

  constructor(private readonly auth: AuthState) {
    this.contract = createConsoleContractClient(auth);
  }

  async health() {
    return await runContract(async () => {
      const result = await this.contract.GET("/health");
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapEnvelope<Entity>(result.data);
    });
  }

  async listProjects(input?: PageInput) {
    return await runContract(async () => {
      const result = await this.contract.GET("/projects", {
        params: { query: queryFromInput(input) as never },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapListEnvelope<Entity>(result.data);
    });
  }

  async getProject(projectId: string) {
    return await runContract(async () => {
      const result = await this.contract.GET("/projects/{projectId}", {
        params: { path: { projectId } },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "project");
    });
  }

  async listObjectives(projectId: string, input?: PageInput) {
    return await runContract(async () => {
      const result = await this.contract.GET("/projects/{projectId}/objectives", {
        params: { path: { projectId }, query: queryFromInput(input) as never },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapListEnvelope<Entity>(result.data);
    });
  }

  async getBoundary(projectId: string) {
    try {
      return await runContract(async () => {
        const result = await this.contract.GET("/projects/{projectId}/boundary", {
          params: { path: { projectId } },
        });
        if (!result.response.ok) throw fromContract(result.error, result.response);
        return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "boundary");
      });
    } catch (error) {
      if (error instanceof ConsoleApiError && error.status === 404) return null;
      throw error;
    }
  }

  async evaluateBoundary(projectId: string, body: Record<string, unknown>) {
    return await runContract(async () => {
      const result = await this.contract.POST("/projects/{projectId}/boundary/evaluate", {
        params: { path: { projectId } },
        body: body as never,
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "evaluation");
    });
  }

  async listPrincipals(input?: PageInput) {
    return await runContract(async () => {
      const result = await this.contract.GET("/principals", {
        params: { query: queryFromInput(input) as never },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapListEnvelope<Entity>(result.data);
    });
  }

  async listAgents(input?: PageInput) {
    return await runContract(async () => {
      const result = await this.contract.GET("/agents", {
        params: { query: queryFromInput(input) as never },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapListEnvelope<Entity>(result.data);
    });
  }

  async listRuntimeBindings(agentId: string) {
    return await runContract(async () => {
      const result = await this.contract.GET("/agents/{agentId}/runtime-bindings", {
        params: { path: { agentId } },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      const data = unwrapEnvelope<Entity>(result.data);
      return toPage<Entity>(extractArray(data, "runtimeBindings") as Entity[]);
    });
  }

  async getLatestState(projectId: string) {
    try {
      return await runContract(async () => {
        const result = await this.contract.GET("/projects/{projectId}/state/latest", {
          params: { path: { projectId } },
        });
        if (!result.response.ok) throw fromContract(result.error, result.response);
        return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "stateView");
      });
    } catch (error) {
      if (error instanceof ConsoleApiError && error.status === 404) return null;
      throw error;
    }
  }

  async rebuildState(projectId: string, knowledgeVersionId: string) {
    return await runContract(async () => {
      const result = await this.contract.POST("/projects/{projectId}/state/rebuild", {
        params: { path: { projectId } },
        body: { knowledgeVersionId },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "stateView");
    });
  }

  async getLatestKnowledge(_projectId: string) {
    try {
      return await runContract(async () => {
        const result = await this.contract.GET("/knowledge/latest");
        if (!result.response.ok) throw fromContract(result.error, result.response);
        return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "knowledgeVersion");
      });
    } catch (error) {
      if (error instanceof ConsoleApiError && error.status === 404) return null;
      throw error;
    }
  }

  async listKnowledgeVersions(input?: PageInput) {
    return await runContract(async () => {
      const result = await this.contract.GET("/knowledge/versions", {
        params: { query: queryFromInput(input) as never },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapListEnvelope<Entity>(result.data);
    });
  }

  async listKnowledgeCandidates(input?: PageInput) {
    const events = await this.listEvents({ ...input, type: "KnowledgeCandidateProposed" });
    return toPage<Entity>(events.data.map((event) => objectPayload(event)));
  }

  async listExternalInputs(projectId: string) {
    const events = await this.listEvents({ type: "ExternalInputSubmitted", limit: 100 });
    return toPage<Entity>(events.data.map((event) => objectPayload(event)).filter((item) => item.projectId === projectId || item.projectId === undefined));
  }

  async listObservations(projectId: string, input?: PageInput) {
    return await runContract(async () => {
      const result = await this.contract.GET("/projects/{projectId}/observations", {
        params: { path: { projectId }, query: queryFromInput(input) as never },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapListEnvelope<Entity>(result.data);
    });
  }

  async listAssignments(projectId: string, input?: PageInput) {
    return await runContract(async () => {
      const result = await this.contract.GET("/projects/{projectId}/assignments", {
        params: { path: { projectId }, query: queryFromInput(input) as never },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapListEnvelope<Entity>(result.data);
    });
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
    return await runContract(async () => {
      const result = await this.contract.POST("/leases/sweep");
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapEnvelope<Entity>(result.data);
    });
  }

  async listActions(projectId: string, input?: PageInput) {
    return await runContract(async () => {
      const result = await this.contract.GET("/projects/{projectId}/actions", {
        params: { path: { projectId }, query: queryFromInput(input) as never },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapListEnvelope<Entity>(result.data);
    });
  }

  async getAction(actionId: string) {
    return await runContract(async () => {
      const result = await this.contract.GET("/actions/{actionId}", {
        params: { path: { actionId } },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "action");
    });
  }

  async evaluateAction(actionId: string, body: Record<string, unknown>) {
    return await runContract(async () => {
      const result = await this.contract.POST("/actions/{actionId}/evaluate", {
        params: { path: { actionId } },
        body: body as never,
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "policyDecision");
    });
  }

  async listNegotiations(input?: PageInput) {
    return await runContract(async () => {
      const result = await this.contract.GET("/negotiations", {
        params: { query: queryFromInput(input) as never },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapListEnvelope<Entity>(result.data);
    });
  }

  async getNegotiation(negotiationId: string) {
    return await runContract(async () => {
      const result = await this.contract.GET("/negotiations/{negotiationId}", {
        params: { path: { negotiationId } },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "negotiation");
    });
  }

  async submitPosition(negotiationId: string, body: Record<string, unknown>) {
    return await runContract(async () => {
      const result = await this.contract.POST("/negotiations/{negotiationId}/positions", {
        params: { path: { negotiationId } },
        body: body as never,
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "negotiation");
    });
  }

  async closeNegotiation(negotiationId: string) {
    return await runContract(async () => {
      const result = await this.contract.POST("/negotiations/{negotiationId}/close", {
        params: { path: { negotiationId } },
        body: { source: "console" },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "decisionRecord");
    });
  }

  async listWorkOrders(projectId: string, input?: PageInput) {
    return await runContract(async () => {
      const result = await this.contract.GET("/work-orders", {
        params: { query: queryFromInput({ ...input, projectId }) as never },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapListEnvelope<Entity>(result.data);
    });
  }

  async getWorkOrder(workOrderId: string) {
    return await runContract(async () => {
      const result = await this.contract.GET("/work-orders/{workOrderId}", {
        params: { path: { workOrderId } },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "workOrder");
    });
  }

  async cancelWorkOrder(workOrderId: string, reason: string) {
    return await runContract(async () => {
      const result = await this.contract.POST("/work-orders/{workOrderId}/cancel", {
        params: { path: { workOrderId } },
        body: { reason },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapEnvelope<Entity>(result.data);
    });
  }

  async listReviews(input?: PageInput) {
    return await runContract(async () => {
      const result = await this.contract.GET("/reviews", {
        params: { query: queryFromInput(input) as never },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapListEnvelope<Entity>(result.data);
    });
  }

  async submitReview(body: Record<string, unknown>) {
    return await runContract(async () => {
      const result = await this.contract.POST("/reviews", { body: body as never });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "review");
    });
  }

  async aggregateReviews(body: Record<string, unknown>) {
    return await runContract(async () => {
      const result = await this.contract.POST("/reviews/aggregate", { body: body as never });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "aggregation");
    });
  }

  async listRewards(projectId: string, input?: PageInput) {
    return await runContract(async () => {
      const result = await this.contract.GET("/rewards", {
        params: { query: queryFromInput({ ...input, projectId }) as never },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapListEnvelope<Entity>(result.data);
    });
  }

  async reserveReward(rewardIntentId: string) {
    return await runContract(async () => {
      const result = await this.contract.POST("/rewards/{rewardIntentId}/reserve", {
        params: { path: { rewardIntentId } },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "rewardIntent");
    });
  }

  async claimReward(rewardIntentId: string, actorId: string) {
    return await runContract(async () => {
      const result = await this.contract.POST("/rewards/{rewardIntentId}/claim", {
        params: { path: { rewardIntentId } },
        body: { actorId },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "rewardIntent");
    });
  }

  async getLedger() {
    return await runContract(async () => {
      const result = await this.contract.GET("/ledger");
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapEnvelope<Entity>(result.data);
    });
  }

  async listReputationEvidence(projectId: string) {
    return await runContract(async () => {
      const result = await this.contract.GET("/reputation/evidence", {
        params: { query: queryFromInput({ projectId, limit: 100 }) as never },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapListEnvelope<Entity>(result.data);
    });
  }

  async listGovernanceIntents(projectId: string) {
    const events = await this.listEvents({ type: "GovernanceIntentCreated", limit: 100 });
    return toPage<Entity>(events.data.map((event) => objectPayload(event)).filter((item) => item.projectId === projectId));
  }

  async submitMockGovernance(governanceIntentId: string) {
    return await runContract(async () => {
      const result = await this.contract.POST("/governance/intents/{governanceIntentId}/submit-mock", {
        params: { path: { governanceIntentId } },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "governanceIntent");
    });
  }

  async listGovernanceSubjects(input?: PageInput) {
    return await runContract(async () => {
      const result = await this.contract.GET("/governance/subjects", {
        params: { query: queryFromInput(input) as never },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      const data = unwrapEnvelope<Entity>(result.data);
      return toPage<Entity>(extractArray(data, "items") as Entity[]);
    });
  }

  async getGovernanceSubject(subjectId: string) {
    return await runContract(async () => {
      const result = await this.contract.GET("/governance/subjects/{subjectId}", {
        params: { path: { subjectId } },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "subject");
    });
  }

  async listGovernanceSubjectVotes(subjectId: string) {
    return await runContract(async () => {
      const result = await this.contract.GET("/governance/subjects/{subjectId}/votes", {
        params: { path: { subjectId } },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      const data = unwrapEnvelope<Entity>(result.data);
      return toPage<Entity>(extractArray(data, "items") as Entity[]);
    });
  }

  async listGovernanceDelegations(input?: PageInput) {
    return await runContract(async () => {
      const result = await this.contract.GET("/governance/delegations", {
        params: { query: queryFromInput(input) as never },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      const data = unwrapEnvelope<Entity>(result.data);
      return toPage<Entity>(extractArray(data, "items") as Entity[]);
    });
  }

  async listGovernanceMerged(projectId?: string, input?: PageInput) {
    return await runContract(async () => {
      const result = await this.contract.GET("/governance/merged", {
        params: { query: queryFromInput({ ...input, projectId }) as never },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      const data = unwrapEnvelope<Entity>(result.data);
      return toPage<Entity>(extractArray(data, "items") as Entity[]);
    });
  }

  async getGovernanceMerged(id: string) {
    return await runContract(async () => {
      const result = await this.contract.GET("/governance/merged/{id}", {
        params: { path: { id } },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "merged");
    });
  }

  async linkGovernanceIntent(intentId: string, body: Record<string, unknown>) {
    return await runContract(async () => {
      const result = await this.contract.POST("/governance/intents/{governanceIntentId}/link-subject", {
        params: { path: { governanceIntentId: intentId } },
        body: body as never,
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "link");
    });
  }

  async submitGovernanceOpenGov(intentId: string, body: Record<string, unknown>) {
    return await runContract(async () => {
      const result = await this.contract.POST("/governance/intents/{governanceIntentId}/submit-opengov", {
        params: { path: { governanceIntentId: intentId } },
        body: body as never,
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapEnvelope<Entity>(result.data);
    });
  }

  async reconcileGovernanceSubject(intentId: string, body: Record<string, unknown>) {
    return await runContract(async () => {
      const result = await this.contract.POST("/governance/intents/{governanceIntentId}/reconcile-subject", {
        params: { path: { governanceIntentId: intentId } },
        body: body as never,
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapEnvelope<Entity>(result.data);
    });
  }

  async submitGovernanceVoteOpenGov(subjectId: string, body: Record<string, unknown>) {
    return await runContract(async () => {
      const result = await this.contract.POST("/governance/subjects/{subjectId}/vote-opengov", {
        params: { path: { subjectId } },
        body: body as never,
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapEnvelope<Entity>(result.data);
    });
  }

  async getGovernanceCheckpointView() {
    return await runContract(async () => {
      const result = await this.contract.GET("/governance/checkpoint");
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapEnvelope<Entity>(result.data);
    });
  }

  async listGovernanceBackends() {
    return await runContract(async () => {
      const result = await this.contract.GET("/governance/backends");
      if (!result.response.ok) throw fromContract(result.error, result.response);
      const data = unwrapEnvelope<Entity>(result.data);
      return toPage<Entity>(extractArray(data, "backends") as Entity[]);
    });
  }

  async listHumanRequests(projectId: string) {
    const [guardianRequests, events] = await Promise.all([
      this.listGuardianRequests(projectId, { limit: 100 }).catch(() => toPage<Entity>([])),
      this.listEvents({ limit: 100 }),
    ]);
    const eventRequests = events.data
      .filter((event) => ["HumanRequestCreated", "GuardianRequestCreated", "EmergencyRequestCreated", "GuardianReviewRequested", "GuardianReviewCompleted"].includes(event.type))
      .map((event) => objectPayload(event))
      .filter((item) => item.projectId === projectId || item.projectId === undefined);
    return toPage<Entity>([...guardianRequests.data, ...eventRequests]);
  }

  async runAgentCollaborationScenario() {
    return await runContract(async () => {
      const post = this.contract.POST as unknown as (path: string) => Promise<{ response: Response; data?: unknown; error?: unknown }>;
      const result = await post("/dev/scenarios/agent-collaboration/runs");
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "run");
    });
  }

  async listAgentCollaborationScenarioRuns(input?: PageInput) {
    return await runContract(async () => {
      const get = this.contract.GET as unknown as (
        path: string,
        init: { params: { query: Record<string, string> } },
      ) => Promise<{ response: Response; data?: unknown; error?: unknown }>;
      const result = await get("/dev/scenarios/agent-collaboration/runs", {
        params: { query: queryFromInput(input) as never },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapListEnvelope<Entity>(result.data);
    });
  }

  async listGuardianRequests(projectId?: string, input?: PageInput) {
    return await runContract(async () => {
      const result = await this.contract.GET("/guardian-requests", {
        params: { query: queryFromInput({ ...input, projectId }) as never },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapListEnvelope<Entity>(result.data);
    });
  }

  async getProjectOverview(projectId: string) {
    return await runContract(async () => {
      const result = await this.contract.GET("/projects/{projectId}/overview", {
        params: { path: { projectId } },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "overview");
    });
  }

  async listProjectTimeline(projectId: string) {
    return await runContract(async () => {
      const result = await this.contract.GET("/projects/{projectId}/timeline", {
        params: { path: { projectId } },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      const data = unwrapEnvelope<Entity>(result.data);
      return toPage<Entity>(extractArray(data, "timeline") as Entity[]);
    });
  }

  async runIncentiveRiskScenario() {
    return await runContract(async () => {
      const post = this.contract.POST as unknown as (path: string) => Promise<{ response: Response; data?: unknown; error?: unknown }>;
      const result = await post("/dev/scenarios/incentive-risk/runs");
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "run");
    });
  }

  async listIncentiveRiskScenarioRuns(input?: PageInput) {
    return await runContract(async () => {
      const get = this.contract.GET as unknown as (
        path: string,
        init: { params: { query: Record<string, string> } },
      ) => Promise<{ response: Response; data?: unknown; error?: unknown }>;
      const result = await get("/dev/scenarios/incentive-risk/runs", {
        params: { query: queryFromInput(input) as never },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapListEnvelope<Entity>(result.data);
    });
  }

  async listSlashRequests(projectId?: string, input?: PageInput) {
    return await runContract(async () => {
      const result = await this.contract.GET("/slash-requests", {
        params: { query: queryFromInput({ ...input, projectId }) as never },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapListEnvelope<Entity>(result.data);
    });
  }

  async submitGuardianDecision(_body: Record<string, unknown>): Promise<Entity> {
    throw new ConsoleApiError({
      code: "UNSUPPORTED",
      message: "Guardian decision API is not available in the current coordinator.",
      status: 501,
    });
  }

  async listTraces(input?: PageInput) {
    return await runContract(async () => {
      const result = await this.contract.GET("/traces", {
        params: { query: queryFromInput(input) as never },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapListEnvelope<Entity>(result.data);
    });
  }

  async getTrace(traceId: string) {
    return await runContract(async () => {
      const result = await this.contract.GET("/traces/{traceId}", {
        params: { path: { traceId } },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "trace");
    });
  }

  async createTrace(projectId: string, body?: Record<string, unknown>) {
    return await runContract(async () => {
      const result = await this.contract.POST("/projects/{projectId}/traces", {
        params: { path: { projectId } },
        body: (body ?? {}) as never,
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "trace");
    });
  }

  async verifyTrace(traceId: string) {
    return await runContract(async () => {
      const result = await this.contract.POST("/traces/{traceId}/verify", {
        params: { path: { traceId } },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapEnvelope<Entity>(result.data);
    });
  }

  async replayTrace(traceId: string) {
    return await runContract(async () => {
      const result = await this.contract.POST("/traces/{traceId}/replay", {
        params: { path: { traceId } },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapEnvelope<Entity>(result.data);
    });
  }

  async listEvents(input?: PageInput) {
    return await runContract(async () => {
      const result = await this.contract.GET("/events", {
        params: { query: queryFromInput(input) as never },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapListEnvelope<EventEnvelope>(result.data);
    });
  }

  // Hand-rolled SSE: the contract package's `sse.ts` currently targets
  // `/projects/:id/events`, which the coordinator does not expose.
  // Migrate to the contract helper once it is realigned with `/projects/:id/stream`.
  streamProjectEvents(projectId: string, handlers: StreamHandlers) {
    const url = this.makeStreamUrl(`/projects/${projectId}/stream`);
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

  // ── V0.2 Network Feed ────────────────────────────────────────────────────
  // Backed by /events until the coordinator exposes /feed.

  async getNetworkFeed(limit = 50) {
    return await this.listEvents({ limit });
  }

  async getFeedEvent(eventId: string) {
    return await runContract(async () => {
      const result = await this.contract.GET("/events/{eventId}", {
        params: { path: { eventId } },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapEnvelope<Entity>(result.data);
    });
  }

  // ── V0.2 Organizations ───────────────────────────────────────────────────
  // Backed by /projects until the coordinator exposes /organizations.

  async getNetworkOrganizations(limit = 50) {
    return await this.listProjects({ limit });
  }

  async getNetworkOrganization(orgId: string) {
    return await this.getProject(orgId);
  }

  async getOrganizationFeed(orgId: string, limit = 50) {
    const events = await this.listEvents({ limit });
    const filtered = events.data.filter(
      (e) => (e as Entity).projectId === orgId || (e.payload as Entity)?.projectId === orgId,
    );
    return toPage<Entity>(filtered as unknown as Entity[]);
  }

  // ── V0.2 Agents ─────────────────────────────────────────────────────────

  async getNetworkAgent(agentId: string) {
    return await runContract(async () => {
      const result = await this.contract.GET("/agents/{agentId}", {
        params: { path: { agentId } },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "agent");
    });
  }

  async getAgentReputation(agentId: string) {
    const evidence = await this.listReputationEvidence(agentId);
    return { agentId, evidence: evidence.data } as Entity;
  }

  // ── V0.2 Domain objects ─────────────────────────────────────────────────

  async getObservationV2(observationId: string) {
    return await runContract(async () => {
      const result = await this.contract.GET("/observations/{observationId}", {
        params: { path: { observationId } },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "observation");
    });
  }

  async getProposalV2(proposalId: string) {
    // Maps to governance/merged until /proposals is in the contract.
    return await this.getGovernanceMerged(proposalId);
  }

  async getVotingRoundV2(votingRoundId: string) {
    // Maps to governance/subjects until /voting-rounds is in the contract.
    return await this.getGovernanceSubject(votingRoundId);
  }

  async getMechanismV2(_mechanismId: string): Promise<Entity> {
    throw new ConsoleApiError({
      code: "NOT_AVAILABLE",
      message: "/mechanisms endpoint is not yet available in the coordinator.",
      status: 501,
    });
  }

  async getTaskV2(taskId: string) {
    // Maps to work-orders until /tasks is in the contract.
    return await this.getWorkOrder(taskId);
  }

  async getArtifactV2(_artifactId: string): Promise<Entity> {
    throw new ConsoleApiError({
      code: "NOT_AVAILABLE",
      message: "/artifacts endpoint is not yet available in the coordinator.",
      status: 501,
    });
  }

  async getDiscussionV2(discussionId: string) {
    // Maps to negotiations until /discussions is in the contract.
    return await this.getNegotiation(discussionId);
  }

  async submitActionIntent(body: Record<string, unknown>): Promise<Entity> {
    // POST /action-intents is not yet in the contract; route through governance intent
    // as a temporary measure. Update once the coordinator exposes /action-intents.
    throw new ConsoleApiError({
      code: "NOT_AVAILABLE",
      message: "/action-intents endpoint is not yet available in the coordinator.",
      status: 501,
    });
  }

  async createAirdropPayload(body: Record<string, unknown>) {
    return await runContract(async () => {
      const result = await this.contract.POST("/identity/airdrop/payload", { body: body as never });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "signingPayload");
    });
  }

  async submitAirdropClaim(body: Record<string, unknown>) {
    return await runContract(async () => {
      const result = await this.contract.POST("/identity/airdrop/claim", { body: body as never });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "claim");
    });
  }

  async getAirdropStatus(evmAddress: string) {
    return await runContract(async () => {
      const result = await this.contract.GET("/identity/airdrop/status/{evmAddress}", {
        params: { path: { evmAddress } },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "claim");
    });
  }

  async createRootRotationPayload(body: Record<string, unknown>) {
    return await runContract(async () => {
      const result = await this.contract.POST("/identity/root-rotation/payload", { body: body as never });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "signingPayload");
    });
  }

  async submitRootRotation(body: Record<string, unknown>) {
    return await runContract(async () => {
      const result = await this.contract.POST("/identity/root-rotation/submit", { body: body as never });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "rootRotation");
    });
  }

  async getIdentityByEvm(evmAddress: string) {
    return await runContract(async () => {
      const result = await this.contract.GET("/identity/status/evm/{evmAddress}", {
        params: { path: { evmAddress } },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "identity");
    });
  }

  async quoteDotVib(body: Record<string, unknown>) {
    return await runContract(async () => {
      const result = await this.contract.POST("/conversion/dot-vib/quote", { body: body as never });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "quote");
    });
  }

  async createDotVibOrder(body: Record<string, unknown>) {
    return await runContract(async () => {
      const result = await this.contract.POST("/conversion/dot-vib/orders", { body: body as never });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "order");
    });
  }

  async getDotVibOrder(orderId: string) {
    return await runContract(async () => {
      const result = await this.contract.GET("/conversion/dot-vib/orders/{orderId}", {
        params: { path: { orderId } },
      });
      if (!result.response.ok) throw fromContract(result.error, result.response);
      return unwrapKey<Entity>(unwrapEnvelope<Entity>(result.data), "order");
    });
  }

  private makeStreamUrl(path: string): string {
    // SSE always traverses the Console proxy, which authenticates the
    // browser via the HttpOnly Auth.js session cookie and then injects
    // the Coordinator Bearer token server-side. Never put credentials
    // in the URL — they would leak via Referer, history, and access logs.
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `/api/coordinator${cleanPath}`;
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

function queryFromInput(input?: PageInput): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    if (value === undefined || value === "") continue;
    out[key] = String(value);
  }
  return out;
}

function fromContract(error: unknown, response: Response | undefined): ConsoleApiError {
  if (error instanceof ContractApiError) {
    return new ConsoleApiError({
      code: error.code ?? `HTTP_${error.status}`,
      message: error.message,
      status: error.status,
      details: error.details,
    });
  }
  const status = response?.status ?? 0;
  const failure = error && typeof error === "object" ? (error as { error?: { code?: string; message?: string; details?: unknown } }) : {};
  return new ConsoleApiError({
    code: failure.error?.code ?? `HTTP_${status}`,
    message: failure.error?.message ?? "Coordinator request failed",
    status,
    details: failure.error?.details ?? error,
  });
}

async function runContract<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ContractApiError) throw fromContract(err, undefined);
    throw err;
  }
}
