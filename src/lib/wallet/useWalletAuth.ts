"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";
import { useCoordinatorClient } from "@/lib/query/hooks";
import type { Entity } from "@/lib/coordinator/types";
import { clearAuthState, useAuthState, writeAuthState } from "@/lib/store/authStore";
import {
  clearWalletSessionToken,
  setWalletSessionToken,
  useWalletSessionToken,
} from "@/lib/wallet/sessionStore";
import {
  getAuthorizedPolkadotAccounts,
  getAuthorizedPolkadotAddress,
  getAuthorizedPolkadotInjector,
} from "@/lib/wallet/polkadotExtension";

export interface WalletSessionState {
  token: string;
  ecosystem: "evm" | "polkadot";
  address: string;
  expiresAt?: string;
}

function isUserRejected(cause: unknown): boolean {
  const message = cause instanceof Error ? cause.message : String(cause ?? "");
  return /rejected by user|user rejected|cancelled|canceled|denied/i.test(message);
}


function readLoginSession(entity: Entity | null): WalletSessionState | null {
  if (!entity) return null;
  const token = typeof entity.sessionToken === "string" ? entity.sessionToken : null;
  const identity = entity.identity && typeof entity.identity === "object" ? entity.identity as Record<string, unknown> : null;
  const primaryKind = identity?.primaryKind === "evm" || identity?.primaryKind === "substrate" ? identity.primaryKind : null;
  const primaryAddress = typeof identity?.primaryAddress === "string" ? identity.primaryAddress : null;
  if (!token || !primaryKind || !primaryAddress) return null;
  return {
    token,
    ecosystem: primaryKind === "substrate" ? "polkadot" : "evm",
    address: primaryAddress,
  };
}

function readSession(entity: Entity | null): WalletSessionState | null {
  if (!entity) return null;
  const token = typeof entity.token === "string" ? entity.token : null;
  const ecosystem = entity.ecosystem === "evm" || entity.ecosystem === "polkadot" ? entity.ecosystem : null;
  const address = typeof entity.address === "string" ? entity.address : null;
  if (!token || !ecosystem || !address) return null;
  return {
    token,
    ecosystem,
    address,
    expiresAt: typeof entity.expiresAt === "string" ? entity.expiresAt : undefined,
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Wallet session refresh timed out")), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (cause) => {
        window.clearTimeout(timer);
        reject(cause);
      },
    );
  });
}

export function useWalletAuth() {
  const client = useCoordinatorClient();
  const auth = useAuthState();
  const walletToken = useWalletSessionToken();
  const [polkadotAddress, setPolkadotAddress] = useState<string | null>(null);
  const [polkadotAccounts, setPolkadotAccounts] = useState<Array<{ address: string; name?: string; source?: string }>>([]);
  const [session, setSession] = useState<WalletSessionState | null>(null);
  const [busy, setBusy] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { address: evmAddress } = useAccount();
  const { connectAsync, connectors, isPending: connectingEvm } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { signMessageAsync, isPending: signingEvm } = useSignMessage();

  const markConnected = useCallback(() => {
    if (auth.connected) return;
    writeAuthState({ ...auth, connected: true });
  }, [auth]);

  const connectEvm = useCallback(async () => {
    setError(null);
    const connector = connectors.find((item: { id: string }) => item.id === "injected") ?? connectors[0];
    if (!connector) throw new Error("未检测到可用的 EVM 浏览器钱包。");
    const result = await connectAsync({ connector });
    const address = result.accounts[0];
    if (!address) throw new Error("未获取到 EVM 地址。");
    return address;
  }, [connectAsync, connectors]);

  const loadPolkadotAccounts = useCallback(async () => {
    setError(null);
    const accounts = await getAuthorizedPolkadotAccounts();
    const next = accounts.map((account) => ({
      address: account.address,
      name: account.meta.name,
      source: account.meta.source,
    }));
    setPolkadotAccounts(next);
    return next;
  }, []);

  const connectPolkadot = useCallback(async (preferredAddress?: string) => {
    setError(null);
    const address = await getAuthorizedPolkadotAddress(preferredAddress);
    if (!address) throw new Error("读取 Polkadot 地址失败。");
    setPolkadotAddress(address);
    return address;
  }, []);

  const refreshSession = useCallback(async () => {
    if (!walletToken) {
      setSession(null);
      return null;
    }
    try {
      const next = readSession(await withTimeout(client.getWalletSession(), 8000));
      setSession(next);
      if (next) {
        setWalletSessionToken(next.token, next.expiresAt);
        markConnected();
        return next;
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "钱包会话恢复失败");
    }
    clearWalletSessionToken();
    clearAuthState();
    setSession(null);
    return null;
  }, [client, markConnected, walletToken]);

  const loginWithEvm = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const normalizedAddress = evmAddress ?? (await connectEvm());
      if (!normalizedAddress) throw new Error("未获取到 EVM 地址。");

      const nonce = await client.createAuthNonce({ address: normalizedAddress, kind: "evm" });
      const message = typeof nonce.message === "string" ? nonce.message : "";
      if (!message) throw new Error("Coordinator 返回的登录消息不完整。");

      const signature = await signMessageAsync({ message });
      const login = await client.loginWithWalletSignature({
        address: normalizedAddress,
        kind: "evm",
        message,
        signature,
      });
      const token = typeof login.sessionToken === "string" ? login.sessionToken : null;
      if (!token) throw new Error("Coordinator 未返回 wallet session token。");

      const next = readLoginSession(login);
      setWalletSessionToken(token, next?.expiresAt);
      setSession(next);
      markConnected();
      return true;
    } catch (cause) {
      if (isUserRejected(cause)) {
        setError(null);
        return false;
      }
      setError(cause instanceof Error ? cause.message : "EVM 钱包登录失败");
      throw cause;
    } finally {
      setBusy(false);
    }
  }, [client, connectEvm, evmAddress, markConnected, signMessageAsync]);

  const loginWithPolkadot = useCallback(async (preferredAddress?: string) => {
    setBusy(true);
    setError(null);
    try {
      const address = await connectPolkadot(preferredAddress);
      const nonce = await client.createAuthNonce({ address, kind: "substrate" });
      const message = typeof nonce.message === "string" ? nonce.message : "";
      if (!message) throw new Error("Coordinator 返回的登录消息不完整。");

      const [{ stringToHex }, injector] = await Promise.all([
        import("@polkadot/util"),
        getAuthorizedPolkadotInjector(address),
      ]);
      if (!injector.signer?.signRaw) throw new Error("当前 Polkadot 钱包不支持 signRaw。");

      const signed = await injector.signer.signRaw({
        address,
        data: stringToHex(message),
        type: "bytes",
      });

      const login = await client.loginWithWalletSignature({
        address,
        kind: "substrate",
        message,
        signature: signed.signature,
      });
      const token = typeof login.sessionToken === "string" ? login.sessionToken : null;
      if (!token) throw new Error("Coordinator 未返回 wallet session token。");

      const next = readLoginSession(login);
      setWalletSessionToken(token, next?.expiresAt);
      setSession(next);
      setPolkadotAddress(address);
      markConnected();
      return true;
    } catch (cause) {
      if (isUserRejected(cause)) {
        setError(null);
        return false;
      }
      setError(cause instanceof Error ? cause.message : "Polkadot 钱包登录失败");
      throw cause;
    } finally {
      setBusy(false);
    }
  }, [client, connectPolkadot, markConnected]);

  const loginWithPolkadotAccount = useCallback(async (account: { address: string; source?: string; name?: string }) => {
    setBusy(true);
    setError(null);
    try {
      const address = account.address;
      if (!address) throw new Error("读取 Polkadot 地址失败。");
      setPolkadotAddress(address);

      const nonce = await client.createAuthNonce({ address, kind: "substrate" });
      const message = typeof nonce.message === "string" ? nonce.message : "";
      if (!message) throw new Error("Coordinator 返回的登录消息不完整。");

      const [{ stringToHex }, injector] = await Promise.all([
        import("@polkadot/util"),
        getAuthorizedPolkadotInjector(address),
      ]);
      if (!injector.signer?.signRaw) throw new Error("当前 Polkadot 钱包不支持 signRaw。");

      const signed = await injector.signer.signRaw({
        address,
        data: stringToHex(message),
        type: "bytes",
      });

      const login = await client.loginWithWalletSignature({
        address,
        kind: "substrate",
        walletName: account.source ?? account.name,
        message,
        signature: signed.signature,
      });
      const token = typeof login.sessionToken === "string" ? login.sessionToken : null;
      if (!token) throw new Error("Coordinator 未返回 wallet session token。");

      const next = readLoginSession(login);
      setWalletSessionToken(token, next?.expiresAt);
      setSession(next);
      markConnected();
      return true;
    } catch (cause) {
      if (isUserRejected(cause)) {
        setError(null);
        return false;
      }
      setError(cause instanceof Error ? cause.message : "Polkadot 钱包登录失败");
      throw cause;
    } finally {
      setBusy(false);
    }
  }, [client, markConnected]);

  const signWalletMessage = useCallback(async (message: string) => {
    setError(null);
    if (session?.ecosystem === "evm" || (!session && evmAddress)) {
      const normalizedAddress = evmAddress ?? (session?.ecosystem === "evm" ? session.address : undefined);
      if (!normalizedAddress) throw new Error("未获取到 EVM 地址。");
      return signMessageAsync({ message });
    }

    const address = session?.ecosystem === "polkadot" ? session.address : polkadotAddress ?? (await connectPolkadot());
    const [{ stringToHex }, injector] = await Promise.all([
      import("@polkadot/util"),
      getAuthorizedPolkadotInjector(address),
    ]);
    if (!injector.signer?.signRaw) throw new Error("当前 Polkadot 钱包不支持 signRaw。");
    const signed = await injector.signer.signRaw({
      address,
      data: stringToHex(message),
      type: "bytes",
    });
    return signed.signature;
  }, [connectPolkadot, evmAddress, polkadotAddress, session, signMessageAsync]);

  const logoutWallet = useCallback(async () => {
    setBusy(true);
    setError(null);
    let revokeError: unknown = null;
    try {
      if (walletToken) await client.deleteWalletSession();
    } catch (cause) {
      revokeError = cause;
    } finally {
      clearWalletSessionToken();
      clearAuthState();
      setSession(null);
      setPolkadotAddress(null);
      if (evmAddress) {
        try {
          await disconnectAsync();
        } catch (cause) {
          revokeError ??= cause;
        }
      }
      if (revokeError) setError(revokeError instanceof Error ? revokeError.message : "钱包会话注销失败");
      setBusy(false);
    }
  }, [client, disconnectAsync, evmAddress, walletToken]);

  useEffect(() => {
    let mounted = true;
    void refreshSession().finally(() => {
      if (mounted) setInitializing(false);
    });
    return () => {
      mounted = false;
    };
  }, [refreshSession]);

  return useMemo(
    () => ({
      evmAddress,
      polkadotAddress,
      session,
      initializing,
      busy: busy || connectingEvm || signingEvm,
      error,
      connectEvm,
      connectPolkadot,
      polkadotAccounts,
      loadPolkadotAccounts,
      loginWithEvm,
      loginWithPolkadot,
      loginWithPolkadotAccount,
      refreshSession,
      signWalletMessage,
      logoutWallet,
    }),
    [
      busy,
      connectEvm,
      connectPolkadot,
      connectingEvm,
      error,
      evmAddress,
      initializing,
      loginWithEvm,
      loginWithPolkadot,
      loginWithPolkadotAccount,
      logoutWallet,
      loadPolkadotAccounts,
      polkadotAddress,
      polkadotAccounts,
      refreshSession,
      signWalletMessage,
      session,
      signingEvm,
    ],
  );
}
