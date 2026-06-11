"use client";

import { useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthState } from "../store/authStore";
import { createCoordinatorClient } from "../coordinator/client";
import { queryKeys } from "./keys";
import { useActiveNetworkProfile } from "@/lib/network/profiles";
import { useWalletSessionToken } from "@/lib/wallet/sessionStore";

export function useCoordinatorClient() {
  const auth = useAuthState();
  const network = useActiveNetworkProfile();
  const walletSessionToken = useWalletSessionToken();
  return useMemo(
    () => createCoordinatorClient(auth, network.id, walletSessionToken),
    [auth, network.id, walletSessionToken],
  );
}

// ── V0.2 Network Feed ────────────────────────────────────────────────────

export function useNetworkFeed(limit = 50) {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  return useQuery({
    queryKey: queryKeys.networkFeed(network.id, limit),
    queryFn: () => client.getNetworkFeed({ limit }),
    placeholderData: (prev) => prev,
  });
}

export function useFeedDetail(eventId: string) {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  return useQuery({
    queryKey: queryKeys.feedEvent(network.id, eventId),
    queryFn: () => client.getFeedEvent(eventId),
    enabled: !!eventId,
  });
}

// ── V0.2 Organizations ───────────────────────────────────────────────────

export function useNetworkOrganizations(limit = 50) {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  return useQuery({
    queryKey: queryKeys.networkOrganizations(network.id, limit),
    queryFn: () => client.getNetworkOrganizations({ limit }),
  });
}

export function useNetworkOrganization(orgId: string) {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  return useQuery({
    queryKey: queryKeys.networkOrganization(network.id, orgId),
    queryFn: () => client.getNetworkOrganization(orgId),
    enabled: !!orgId,
  });
}

export function useProjects(limit = 200) {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  return useQuery({
    queryKey: [...queryKeys.projects(network.id), limit] as const,
    queryFn: () => client.listProjects({ limit }),
  });
}

export function useProject(projectId: string) {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  return useQuery({
    queryKey: queryKeys.project(network.id, projectId),
    queryFn: () => client.getProject(projectId),
    enabled: !!projectId,
  });
}

export function useProjectOverview(projectId: string) {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  return useQuery({
    queryKey: queryKeys.projectOverview(network.id, projectId),
    queryFn: () => client.getProjectOverview(projectId),
    enabled: !!projectId,
  });
}

export function useProjectTimeline(projectId: string) {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  return useQuery({
    queryKey: queryKeys.projectTimeline(network.id, projectId),
    queryFn: () => client.listProjectTimeline(projectId),
    enabled: !!projectId,
  });
}

export function useOrganizationFeed(orgId: string, limit = 50) {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  return useQuery({
    queryKey: queryKeys.organizationFeed(network.id, orgId, limit),
    queryFn: () => client.getOrganizationFeed(orgId, { limit }),
    enabled: !!orgId,
    placeholderData: (prev) => prev,
  });
}

// ── V0.2 Agents ─────────────────────────────────────────────────────────

export function useNetworkAgents(limit = 50) {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  return useQuery({
    queryKey: queryKeys.networkAgents(network.id, limit),
    queryFn: () => client.listAgentProfiles({ limit }),
  });
}

export function useNetworkAgent(agentId: string) {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  return useQuery({
    queryKey: queryKeys.networkAgent(network.id, agentId),
    queryFn: () => client.getNetworkAgent(agentId),
    enabled: !!agentId,
  });
}

export function useAgentReputation(agentId: string) {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  return useQuery({
    queryKey: queryKeys.agentReputation(network.id, agentId),
    queryFn: () => client.getAgentReputation(agentId),
    enabled: !!agentId,
  });
}

export function usePersonalCenter() {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  return useQuery({
    queryKey: queryKeys.personalCenter(network.id),
    queryFn: () => client.getPersonalCenter(),
  });
}

export function useAgentRewards(principalId?: string | null, limit = 50, enabled = true) {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  return useQuery({
    queryKey: queryKeys.agentRewards(network.id, principalId),
    queryFn: () => client.getAgentRewards({ principalId: principalId ?? undefined, limit }),
    enabled,
  });
}

export function useAgentReward(principalId?: string | null) {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  return useQuery({
    queryKey: queryKeys.agentRewards(network.id, principalId),
    queryFn: () => client.getAgentReward(principalId ?? ""),
    enabled: Boolean(principalId),
  });
}

export function useRewardDays(limit = 30, enabled = true) {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  return useQuery({
    queryKey: queryKeys.rewardDays(network.id, limit),
    queryFn: () => client.getRewardDays({ limit }),
    enabled,
  });
}

export function useTaskRewards(input?: { taskId?: string | null; principalId?: string | null; limit?: number; enabled?: boolean }) {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  return useQuery({
    queryKey: queryKeys.taskRewards(network.id, input?.taskId, input?.principalId),
    queryFn: () => client.getTaskRewards({
      taskId: input?.taskId ?? undefined,
      principalId: input?.principalId ?? undefined,
      limit: input?.limit ?? 50,
    }),
    enabled: input?.enabled ?? true,
  });
}

export function useCreateTaskRewardSuggestion() {
  const client = useCoordinatorClient();
  const queryClient = useQueryClient();
  const network = useActiveNetworkProfile();
  return useMutation({
    mutationFn: ({ taskId, body }: { taskId: string; body: Record<string, unknown> }) => client.createTaskRewardSuggestion(taskId, body),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.taskV2(network.id, variables.taskId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.taskRewards(network.id, variables.taskId, null) });
    },
  });
}

export function useApproveTaskReward() {
  const client = useCoordinatorClient();
  const queryClient = useQueryClient();
  const network = useActiveNetworkProfile();
  return useMutation({
    mutationFn: ({ taskId, body }: { taskId: string; body: Record<string, unknown> }) => client.approveTaskReward(taskId, body),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.taskV2(network.id, variables.taskId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.taskRewards(network.id, variables.taskId, null) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.personalCenter(network.id) });
    },
  });
}

export function useGuardianDecision(accountId?: string | null) {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  return useQuery({
    queryKey: queryKeys.guardianDecision(network.id, accountId ?? ""),
    queryFn: () => client.getGuardianDecision(accountId ?? ""),
    enabled: Boolean(accountId),
  });
}

// ── Get VIB ──────────────────────────────────────────────────────────────

export function useGetVibConfig() {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  return useQuery({
    queryKey: queryKeys.getVibConfig(network.id),
    queryFn: () => client.getGetVibConfig(),
  });
}

export function useGetVibQuote(amount: string, enabled = true) {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  return useQuery({
    queryKey: queryKeys.getVibQuote(network.id, amount),
    queryFn: () => client.quoteGetVib(amount),
    enabled: enabled && Number(amount) > 0,
    placeholderData: (prev) => prev,
  });
}

export function useGetVibSummary(accountId?: string | null) {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  return useQuery({
    queryKey: queryKeys.getVibSummary(network.id, accountId ?? ""),
    queryFn: () => client.getGetVibSummary(accountId ?? ""),
    enabled: Boolean(accountId),
  });
}

export function useGetVibProof(accountId?: string | null) {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  return useQuery({
    queryKey: queryKeys.getVibProof(network.id, accountId ?? ""),
    queryFn: () => client.getGetVibProof(accountId ?? ""),
    enabled: Boolean(accountId),
    retry: false,
  });
}

export function useGetVibRecords(accountId?: string | null) {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  return useQuery({
    queryKey: queryKeys.getVibRecords(network.id, accountId ?? ""),
    queryFn: () => client.getGetVibRecords(accountId ?? ""),
    enabled: Boolean(accountId),
  });
}

export function useGetVibCurve() {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  return useQuery({
    queryKey: queryKeys.getVibCurve(network.id),
    queryFn: () => client.getGetVibCurve(),
  });
}

export function useCreateGetVibOrder() {
  const client = useCoordinatorClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => client.createGetVibOrder(body),
    onSuccess: (_order, body) => {
      const accountId = typeof body.accountId === "string" ? body.accountId : "";
      const networkId = typeof body.networkId === "string" ? body.networkId : "";
      if (accountId && networkId) void queryClient.invalidateQueries({ queryKey: queryKeys.getVibRecords(networkId, accountId) });
    },
  });
}

export function useRecordGetVibClaim() {
  const client = useCoordinatorClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => client.recordGetVibClaim(body),
    onSuccess: (_claim, body) => {
      const accountId = typeof body.accountId === "string" ? body.accountId : "";
      const networkId = typeof body.networkId === "string" ? body.networkId : "";
      if (accountId) {
        if (networkId) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.getVibSummary(networkId, accountId) });
          void queryClient.invalidateQueries({ queryKey: queryKeys.getVibRecords(networkId, accountId) });
        } else {
          void queryClient.invalidateQueries({ queryKey: ["get-vib"] });
        }
      }
    },
  });
}

export function useSponsorGetVibClaim() {
  const client = useCoordinatorClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown> = {}) => client.sponsorGetVibClaim(body),
    onSuccess: (_result, body) => {
      const accountId = typeof body.accountId === "string" ? body.accountId : "";
      const networkId = typeof body.networkId === "string" ? body.networkId : "";
      if (accountId && networkId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.getVibSummary(networkId, accountId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.getVibRecords(networkId, accountId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.getVibProof(networkId, accountId) });
      } else {
        void queryClient.invalidateQueries({ queryKey: ["get-vib"] });
      }
    },
  });
}

// ── V0.2 Domain objects ─────────────────────────────────────────────────

export function useObservationV2(id: string) {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  return useQuery({
    queryKey: queryKeys.observationV2(network.id, id),
    queryFn: () => client.getObservationV2(id),
    enabled: !!id,
  });
}

export function useProposalV2(id: string) {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  return useQuery({
    queryKey: queryKeys.proposalV2(network.id, id),
    queryFn: () => client.getProposalV2(id),
    enabled: !!id,
  });
}

export function useVotingRoundV2(id: string) {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  return useQuery({
    queryKey: queryKeys.votingRoundV2(network.id, id),
    queryFn: () => client.getVotingRoundV2(id),
    enabled: !!id,
  });
}

export function useMechanismV2(id: string) {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  return useQuery({
    queryKey: queryKeys.mechanismV2(network.id, id),
    queryFn: () => client.getMechanismV2(id),
    enabled: !!id,
  });
}

export function useTaskV2(id: string) {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  return useQuery({
    queryKey: queryKeys.taskV2(network.id, id),
    queryFn: () => client.getTaskV2(id),
    enabled: !!id,
  });
}

export function useArtifactV2(id: string) {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  return useQuery({
    queryKey: queryKeys.artifactV2(network.id, id),
    queryFn: () => client.getArtifactV2(id),
    enabled: !!id,
  });
}

export function useDiscussionV2(id: string) {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  return useQuery({
    queryKey: queryKeys.discussionV2(network.id, id),
    queryFn: () => client.getDiscussionV2(id),
    enabled: !!id,
  });
}

// ── V0.2 ActionIntent ────────────────────────────────────────────────────

export function useSubmitActionIntent() {
  const client = useCoordinatorClient();
  const clientRef = useRef(client);
  clientRef.current = client;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => clientRef.current.submitActionIntent(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["network-feed"] });
      void queryClient.invalidateQueries({ queryKey: ["network-organizations"] });
      void queryClient.invalidateQueries({ queryKey: ["organization-feed"] });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
