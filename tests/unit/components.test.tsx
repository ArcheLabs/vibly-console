import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RiskBadge, StatusBadge } from "@/components/common/Badge";
import { JsonViewer } from "@/components/common/JsonViewer";

describe("common components", () => {
  it("renders status and risk badges", () => {
    render(
      <div>
        <StatusBadge status="active" />
        <RiskBadge risk="critical" />
      </div>,
    );
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(screen.getByText("critical")).toBeInTheDocument();
  });

  it("renders raw JSON", () => {
    render(<JsonViewer value={{ id: "evt_1" }} />);
    expect(screen.getByText("Raw JSON")).toBeInTheDocument();
    expect(screen.getByText(/evt_1/)).toBeInTheDocument();
  });
});
