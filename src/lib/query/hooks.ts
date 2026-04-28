"use client";

import { useMemo } from "react";
import { useAuthState } from "../store/authStore";
import { createCoordinatorClient } from "../coordinator/client";

export function useCoordinatorClient() {
  const auth = useAuthState();
  return useMemo(() => createCoordinatorClient(auth), [auth]);
}
