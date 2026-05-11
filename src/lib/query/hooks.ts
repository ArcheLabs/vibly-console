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
    queryKey: queryKeys.networkFeed,
    queryFn: () => client.getNetworkFeed(limit),
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
    queryKey: queryKeys.networkOrganizations,
    queryFn: () => client.getNetworkOrganizations(limit),
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

export function useOrganizationFeed(orgId: string, limit = 50) {
  const client = useCoordinatorClient();
  return useQuery({
    queryKey: queryKeys.organizationFeed(orgId),
    queryFn: () => client.getOrganizationFeed(orgId, limit),
    enabled: !!orgId,
  });
}

// ── V0.2 Agents ─────────────────────────────────────────────────────────

export function useNetworkAgents(limit = 50) {
  const client = useCoordinatorClient();
  return useQuery({
    queryKey: queryKeys.networkAgents,
    queryFn: () => client.listAgents({ limit }),
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.networkFeed });
    },
  });
}
