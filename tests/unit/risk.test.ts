import { describe, expect, it } from "vitest";
import { riskTone, statusTone } from "@/lib/utils/risk";

describe("risk utilities", () => {
  it("maps risk levels to tones", () => {
    expect(riskTone("low")).toBe("success");
    expect(riskTone("critical")).toBe("critical");
  });

  it("maps known statuses to tones", () => {
    expect(statusTone("active")).toBe("success");
    expect(statusTone("rejected")).toBe("danger");
  });
});
