import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { invalidateForEvent } from "@/lib/query/eventInvalidation";

describe("event cache invalidation", () => {
  it("invalidates affected queries for action events", () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, "invalidateQueries");
    invalidateForEvent(queryClient, "project_1", { type: "ActionProposed" }, "substrate:vibly-solo");
    expect(spy).toHaveBeenCalledWith({ queryKey: ["section", "project_1", "actions"] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["events", "substrate:vibly-solo", "project_1"] });
  });
});
