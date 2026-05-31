"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCoordinatorClient } from "./hooks";
import { useActiveNetworkProfile } from "@/lib/network/profiles";

export type LiveStatus = "connected" | "disconnected" | "error";

export function useGetVibLiveEvents(options: { enabled?: boolean } = {}): { status: LiveStatus } {
  const enabled = options.enabled ?? true;
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<LiveStatus>("disconnected");

  useEffect(() => {
    if (!enabled) {
      setStatus("disconnected");
      return;
    }
    return client.streamGetVibEvents({
      onStatus: setStatus,
      onEvent: () => {
        void queryClient.invalidateQueries({ queryKey: ["get-vib", network.id] });
      },
    });
  }, [client, enabled, network.id, queryClient]);

  return { status };
}
