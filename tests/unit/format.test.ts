import { describe, expect, it } from "vitest";
import { compactId, readableKey } from "@/lib/utils/format";

describe("format utilities", () => {
  it("compacts long ids", () => {
    expect(compactId("project_1234567890abcdef")).toBe("project_12...abcdef");
  });

  it("makes keys readable", () => {
    expect(readableKey("risk_level")).toBe("Risk Level");
    expect(readableKey("knowledgeVersion")).toBe("Knowledge Version");
  });
});
