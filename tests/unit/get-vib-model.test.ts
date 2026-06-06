import { describe, expect, it } from "vitest";
import { baseUnitsToDecimal, decimalToBaseUnits, estimatedSlippagePercent } from "@/lib/get-vib/amounts";
import { mergeGetVibRecords, paginateRecords } from "@/lib/get-vib/records";

describe("Get VIB model helpers", () => {
  it("converts payment decimals to base units and back", () => {
    expect(decimalToBaseUnits("1.25", 10)).toBe(12_500_000_000n);
    expect(decimalToBaseUnits("0.0000000001", 10)).toBe(1n);
    expect(baseUnitsToDecimal("12500000000", 10, 4)).toBe("1.25");
  });

  it("calculates estimated slippage from start and average prices", () => {
    expect(estimatedSlippagePercent(0.01, 0.0101)).toBeCloseTo(1, 6);
    expect(estimatedSlippagePercent(0.01, 0.0099)).toBeCloseTo(-1, 6);
    expect(estimatedSlippagePercent(0, 0.01)).toBe(0);
  });

  it("merges local pending records with remote relay deposits", () => {
    const records = mergeGetVibRecords({
      pending: [
        {
          txHash: "0xpending",
          paymentAmount: "1",
          estimatedVib: "1097",
          estimatedSlippage: "+1.00%",
          submittedAt: "2026-05-29T10:00:00.000Z",
          status: "submitted",
        },
        {
          txHash: "0xconfirmed",
          paymentAmount: "0.5",
          estimatedVib: "546",
          estimatedSlippage: "+0.50%",
          submittedAt: "2026-05-29T09:00:00.000Z",
          status: "submitted",
        },
      ],
      remote: {
        relayDeposits: [
          {
            sourceId: "relay:1",
            extrinsicHash: "0xconfirmed",
            dotAmount: "0.5",
            status: "confirmed",
            finalizedAt: "2026-05-29T09:05:00.000Z",
          },
        ],
        allocations: [
          {
            sourceId: "relay:1",
            vibAmount: "546",
            startPriceDot: 0.00091,
            averagePriceDot: 0.00092,
          },
        ],
      },
    });

    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({ txHash: "0xpending", status: "submitted" });
    expect(records[1]).toMatchObject({ txHash: "0xconfirmed", status: "claimable", receivedVib: "546" });
  });

  it("paginates records with bounded pages", () => {
    const records = Array.from({ length: 21 }, (_, index) => index);
    expect(paginateRecords(records, 1, 10)).toMatchObject({ page: 1, pageCount: 3, items: records.slice(0, 10) });
    expect(paginateRecords(records, 9, 10)).toMatchObject({ page: 3, pageCount: 3, items: records.slice(20) });
  });
});
