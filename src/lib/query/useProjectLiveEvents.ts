"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { EventEnvelope } from "../coordinator/types";
import { useCoordinatorClient } from "./hooks";
import { invalidateForEvent } from "./eventInvalidation";
import { useActiveNetworkProfile } from "@/lib/network/profiles";

export type LiveStatus = "connected" | "disconnected" | "error";

export interface ProjectLiveEventsState {
  status: LiveStatus;
  events: EventEnvelope[];
}

export function useProjectLiveEvents(projectId: string, options: { enabled?: boolean; limit?: number } = {}): ProjectLiveEventsState {
  const enabled = options.enabled ?? true;
  const limit = options.limit ?? 20;
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<LiveStatus>("disconnected");
  const [events, setEvents] = useState<EventEnvelope[]>([]);

  useEffect(() => {
    if (!enabled) {
      setStatus("disconnected");
      return;
    }
    return client.streamProjectEvents(projectId, {
      onStatus: setStatus,
      onEvent: (event) => {
        setEvents((current) => [event, ...current].slice(0, limit));
        invalidateForEvent(queryClient, projectId, event, network.id);
      },
    });
  }, [client, enabled, limit, network.id, projectId, queryClient]);

  return { status, events };
}
