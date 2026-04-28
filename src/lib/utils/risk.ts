export type RiskLevel = "low" | "medium" | "high" | "critical" | string;

export function riskTone(risk: RiskLevel): "neutral" | "success" | "warning" | "danger" | "critical" {
  switch (String(risk).toLowerCase()) {
    case "low":
      return "success";
    case "medium":
      return "warning";
    case "high":
      return "danger";
    case "critical":
      return "critical";
    default:
      return "neutral";
  }
}

export function statusTone(status: unknown): "neutral" | "success" | "warning" | "danger" | "critical" {
  const text = String(status ?? "").toLowerCase();
  if (["active", "ok", "valid", "accepted", "approved", "claimed", "submitted", "connected"].includes(text)) return "success";
  if (["draft", "pending", "open", "reserved", "under_review", "needs_revision"].includes(text)) return "warning";
  if (["failed", "rejected", "cancelled", "expired", "invalid", "error", "revoked"].includes(text)) return "danger";
  if (["critical", "paused", "prohibited"].includes(text)) return "critical";
  return "neutral";
}
