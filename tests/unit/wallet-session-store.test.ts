import { beforeEach, describe, expect, it } from "vitest";
import {
  clearWalletSessionToken,
  readWalletSessionToken,
  setWalletSessionToken,
} from "@/lib/wallet/sessionStore";

describe("wallet session store", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    clearWalletSessionToken();
  });

  it("persists wallet session token in sessionStorage", () => {
    setWalletSessionToken("wallet_token_1", "2099-01-01T00:00:00.000Z");

    expect(readWalletSessionToken()).toBe("wallet_token_1");
    expect(window.sessionStorage.getItem("vibly-wallet-session")).toContain("wallet_token_1");
  });

  it("clears expired wallet session records", () => {
    window.sessionStorage.setItem(
      "vibly-wallet-session",
      JSON.stringify({ token: "expired", expiresAt: "2000-01-01T00:00:00.000Z" }),
    );

    expect(readWalletSessionToken()).toBeNull();
    expect(window.sessionStorage.getItem("vibly-wallet-session")).toBeNull();
  });

  it("clears wallet session token on logout", () => {
    setWalletSessionToken("wallet_token_2");
    clearWalletSessionToken();

    expect(readWalletSessionToken()).toBeNull();
    expect(window.sessionStorage.getItem("vibly-wallet-session")).toBeNull();
  });
});
