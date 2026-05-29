export function decimalToBaseUnits(value: string, decimals: number): bigint {
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) throw new Error("Invalid amount");
  const [wholeRaw, fractionRaw = ""] = trimmed.split(".");
  const whole = wholeRaw || "0";
  const fraction = `${fractionRaw}${"0".repeat(decimals)}`.slice(0, decimals);
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction || "0");
}

export function baseUnitsToDecimal(value: bigint | string, decimals: number, maxFractionDigits = 4): string {
  const amount = typeof value === "bigint" ? value : BigInt(value || "0");
  const scale = 10n ** BigInt(decimals);
  const whole = amount / scale;
  const fractionRaw = String(amount % scale).padStart(decimals, "0");
  const fraction = fractionRaw.slice(0, maxFractionDigits).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : String(whole);
}

export function isPositiveDecimal(value: string): boolean {
  try {
    return decimalToBaseUnits(value, 12) > 0n;
  } catch {
    return false;
  }
}

export function estimatedSlippagePercent(startPrice: unknown, averagePrice: unknown): number {
  const start = Number(startPrice);
  const average = Number(averagePrice);
  if (!Number.isFinite(start) || !Number.isFinite(average) || start <= 0) return 0;
  return ((average - start) / start) * 100;
}
