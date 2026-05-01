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
  if (type.includes("Guardian") || type.includes("HumanRequest")) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.section(projectId, "guardian") });
    void queryClient.invalidateQueries({ queryKey: queryKeys.section(projectId, "phase-f") });
  }
  if (type.includes("Trace")) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.traces });
    void queryClient.invalidateQueries({ queryKey: queryKeys.section(projectId, "traces") });
  }
  if (type.includes("Governance") || type.includes("Checkpoint")) void queryClient.invalidateQueries({ queryKey: queryKeys.section(projectId, "governance") });
  if (type.includes("PhaseF") || type.includes("PhaseGTimeline")) void queryClient.invalidateQueries({ queryKey: queryKeys.section(projectId, "phase-f") });
  if (type.includes("PhaseGTimeline")) void queryClient.invalidateQueries({ queryKey: queryKeys.projectTimeline(projectId) });
  if (type.includes("PhaseH") || type.includes("Reputation") || type.includes("Slash")) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.section(projectId, "phase-h") });
    void queryClient.invalidateQueries({ queryKey: queryKeys.section(projectId, "reputation") });
    void queryClient.invalidateQueries({ queryKey: queryKeys.section(projectId, "guardian") });
  }
  void queryClient.invalidateQueries({ queryKey: queryKeys.projectOverview(projectId) });
  if (type.includes("Reward") || type.includes("Funding")) void queryClient.invalidateQueries({ queryKey: queryKeys.section(projectId, "rewards") });
  void queryClient.invalidateQueries({ queryKey: queryKeys.events(projectId) });
}
