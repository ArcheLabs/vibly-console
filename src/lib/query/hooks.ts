"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthState } from "../store/authStore";
import { createCoordinatorClient } from "../coordinator/client";
import { queryKeys } from "./keys";

export function useCoordinatorClient() {
  const auth = useAuthState();
  return useMemo(() => createCoordinatorClient(auth), [auth]);
}

// ── V0.2 Network Feed ────────────────────────────────────────────────────

export function useNetworkFeed(limit = 50) {
  const client = useCoordinatorClient();
  return useQuery({
    queryKey: queryKeys.networkFeed(limit),
    queryFn: () => client.getNetworkFeed({ limit }),
    placeholderData: (prev) => prev,
  });
}

export function useFeedDetail(eventId: string) {
  const client = useCoordinatorClient();
  return useQuery({
    queryKey: queryKeys.feedEvent(eventId),
    queryFn: () => client.getFeedEvent(eventId),
    enabled: !!eventId,
  });
}

// ── V0.2 Organizations ───────────────────────────────────────────────────

export function useNetworkOrganizations(limit = 50) {
  const client = useCoordinatorClient();
  return useQuery({
    queryKey: queryKeys.networkOrganizations(limit),
    queryFn: () => client.getNetworkOrganizations({ limit }),
  });
}

export function useNetworkOrganization(orgId: string) {
  const client = useCoordinatorClient();
  return useQuery({
    queryKey: queryKeys.networkOrganization(orgId),
    queryFn: () => client.getNetworkOrganization(orgId),
    enabled: !!orgId,
  });
}

export function useProject(projectId: string) {
  const client = useCoordinatorClient();
  return useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: () => client.getProject(projectId),
    enabled: !!projectId,
  });
}

export function useProjectOverview(projectId: string) {
  const client = useCoordinatorClient();
  return useQuery({
    queryKey: queryKeys.projectOverview(projectId),
    queryFn: () => client.getProjectOverview(projectId),
    enabled: !!projectId,
  });
}

export function useProjectTimeline(projectId: string) {
  const client = useCoordinatorClient();
  return useQuery({
    queryKey: queryKeys.projectTimeline(projectId),
    queryFn: () => client.listProjectTimeline(projectId),
    enabled: !!projectId,
  });
}

export function useOrganizationFeed(orgId: string, limit = 50) {
  const client = useCoordinatorClient();
  return useQuery({
    queryKey: queryKeys.organizationFeed(orgId, limit),
    queryFn: () => client.getOrganizationFeed(orgId, { limit }),
    enabled: !!orgId,
    placeholderData: (prev) => prev,
  });
}

// ── V0.2 Agents ─────────────────────────────────────────────────────────

export function useNetworkAgents(limit = 50) {
  const client = useCoordinatorClient();
  return useQuery({
    queryKey: queryKeys.networkAgents(limit),
    queryFn: () => client.listAgentProfiles({ limit }),
  });
}

export function useNetworkAgent(agentId: string) {
  const client = useCoordinatorClient();
  return useQuery({
    queryKey: queryKeys.networkAgent(agentId),
    queryFn: () => client.getNetworkAgent(agentId),
    enabled: !!agentId,
  });
}

export function useAgentReputation(agentId: string) {
  const client = useCoordinatorClient();
  return useQuery({
    queryKey: queryKeys.agentReputation(agentId),
    queryFn: () => client.getAgentReputation(agentId),
    enabled: !!agentId,
  });
}

export function usePersonalCenter() {
  const client = useCoordinatorClient();
  return useQuery({
    queryKey: queryKeys.personalCenter,
    queryFn: () => client.getPersonalCenter(),
  });
}

// ── Get VIB ──────────────────────────────────────────────────────────────

export function useGetVibConfig() {
  const client = useCoordinatorClient();
  return useQuery({
    queryKey: queryKeys.getVibConfig,
    queryFn: () => client.getGetVibConfig(),
  });
}

export function useGetVibQuote(amount: string) {
  const client = useCoordinatorClient();
  return useQuery({
    queryKey: queryKeys.getVibQuote(amount),
    queryFn: () => client.quoteGetVib(amount),
    enabled: Number(amount) > 0,
    placeholderData: (prev) => prev,
  });
}

export function useGetVibSummary(accountId?: string | null) {
  const client = useCoordinatorClient();
  return useQuery({
    queryKey: queryKeys.getVibSummary(accountId ?? ""),
    queryFn: () => client.getGetVibSummary(accountId ?? ""),
    enabled: Boolean(accountId),
  });
}

export function useGetVibProof(accountId?: string | null) {
  const client = useCoordinatorClient();
  return useQuery({
    queryKey: queryKeys.getVibProof(accountId ?? ""),
    queryFn: () => client.getGetVibProof(accountId ?? ""),
    enabled: Boolean(accountId),
    retry: false,
  });
}

export function useGetVibRecords(accountId?: string | null) {
  const client = useCoordinatorClient();
  return useQuery({
    queryKey: queryKeys.getVibRecords(accountId ?? ""),
    queryFn: () => client.getGetVibRecords(accountId ?? ""),
    enabled: Boolean(accountId),
  });
}

export function useGetVibCurve() {
  const client = useCoordinatorClient();
  return useQuery({
    queryKey: queryKeys.getVibCurve,
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
      if (accountId) void queryClient.invalidateQueries({ queryKey: queryKeys.getVibRecords(accountId) });
    },
  });
}

// ── V0.2 Domain objects ─────────────────────────────────────────────────

export function useObservationV2(id: string) {
  const client = useCoordinatorClient();
  return useQuery({
    queryKey: queryKeys.observationV2(id),
    queryFn: () => client.getObservationV2(id),
    enabled: !!id,
  });
}

export function useProposalV2(id: string) {
  const client = useCoordinatorClient();
  return useQuery({
    queryKey: queryKeys.proposalV2(id),
    queryFn: () => client.getProposalV2(id),
    enabled: !!id,
  });
}

export function useVotingRoundV2(id: string) {
  const client = useCoordinatorClient();
  return useQuery({
    queryKey: queryKeys.votingRoundV2(id),
    queryFn: () => client.getVotingRoundV2(id),
    enabled: !!id,
  });
}

export function useMechanismV2(id: string) {
  const client = useCoordinatorClient();
  return useQuery({
    queryKey: queryKeys.mechanismV2(id),
    queryFn: () => client.getMechanismV2(id),
    enabled: !!id,
  });
}

export function useTaskV2(id: string) {
  const client = useCoordinatorClient();
  return useQuery({
    queryKey: queryKeys.taskV2(id),
    queryFn: () => client.getTaskV2(id),
    enabled: !!id,
  });
}

export function useArtifactV2(id: string) {
  const client = useCoordinatorClient();
  return useQuery({
    queryKey: queryKeys.artifactV2(id),
    queryFn: () => client.getArtifactV2(id),
    enabled: !!id,
  });
}

export function useDiscussionV2(id: string) {
  const client = useCoordinatorClient();
  return useQuery({
    queryKey: queryKeys.discussionV2(id),
    queryFn: () => client.getDiscussionV2(id),
    enabled: !!id,
  });
}

// ── V0.2 ActionIntent ────────────────────────────────────────────────────

export function useSubmitActionIntent() {
  const client = useCoordinatorClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => client.submitActionIntent(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.networkFeed() });
    },
  });
}
