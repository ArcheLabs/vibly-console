import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./keys";
import type { EventEnvelope } from "../coordinator/types";

export function invalidateForEvent(queryClient: QueryClient, projectId: string, event: EventEnvelope): void {
  const type = event.type;
  if (type === "ProjectCreated") void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
  if (type.includes("Objective")) void queryClient.invalidateQueries({ queryKey: queryKeys.objectives(projectId) });
  if (type.includes("Boundary")) void queryClient.invalidateQueries({ queryKey: queryKeys.boundary(projectId) });
  if (type.includes("StateView")) void queryClient.invalidateQueries({ queryKey: queryKeys.state(projectId) });
  if (type.includes("Knowledge")) void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge(projectId) });
  if (type.includes("Action")) void queryClient.invalidateQueries({ queryKey: queryKeys.section(projectId, "actions") });
  if (type.includes("Negotiation")) void queryClient.invalidateQueries({ queryKey: queryKeys.section(projectId, "negotiations") });
  if (type.includes("Work")) void queryClient.invalidateQueries({ queryKey: queryKeys.section(projectId, "work") });
  if (type.includes("Review")) void queryClient.invalidateQueries({ queryKey: queryKeys.section(projectId, "reviews") });
  if (type.includes("Reward") || type.includes("Funding")) void queryClient.invalidateQueries({ queryKey: queryKeys.section(projectId, "rewards") });
  void queryClient.invalidateQueries({ queryKey: queryKeys.events(projectId) });
}
