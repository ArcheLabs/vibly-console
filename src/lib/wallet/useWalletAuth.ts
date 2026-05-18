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

interface WalletSessionState {
  token: string;
  ecosystem: "evm" | "polkadot";
  address: string;
  expiresAt?: string;
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

  const connectPolkadot = useCallback(async () => {
    setError(null);
    const { web3Accounts, web3Enable } = await import("@polkadot/extension-dapp");
    const extensions = await web3Enable("Vibly Console");
    if (!extensions.length) throw new Error("未检测到 Polkadot 钱包扩展。");
    const accounts = await web3Accounts();
    if (!accounts.length) throw new Error("Polkadot 钱包中没有可用账号。");
    const address = accounts[0]?.address;
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

      const challenge = await client.createWalletChallenge({ ecosystem: "evm", address: normalizedAddress });
      const challengeId = typeof challenge.id === "string" ? challenge.id : "";
      const message = typeof challenge.message === "string" ? challenge.message : "";
      if (!challengeId || !message) throw new Error("Coordinator 返回的 challenge 不完整。");

      const signature = await signMessageAsync({ message });
      const walletSession = await client.createWalletSession({
        challengeId,
        ecosystem: "evm",
        address: normalizedAddress,
        signature,
      });
      const token = typeof walletSession.token === "string" ? walletSession.token : null;
      if (!token) throw new Error("Coordinator 未返回 wallet session token。");

      const next = readSession(walletSession);
      setWalletSessionToken(token, next?.expiresAt);
      setSession(next);
      markConnected();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "EVM 钱包登录失败");
      throw cause;
    } finally {
      setBusy(false);
    }
  }, [client, connectEvm, evmAddress, markConnected, signMessageAsync]);

  const loginWithPolkadot = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const address = polkadotAddress ?? (await connectPolkadot());
      const challenge = await client.createWalletChallenge({ ecosystem: "polkadot", address });
      const challengeId = typeof challenge.id === "string" ? challenge.id : "";
      const message = typeof challenge.message === "string" ? challenge.message : "";
      if (!challengeId || !message) throw new Error("Coordinator 返回的 challenge 不完整。");

      const [{ web3FromAddress }, { stringToHex }] = await Promise.all([
        import("@polkadot/extension-dapp"),
        import("@polkadot/util"),
      ]);
      const injector = await web3FromAddress(address);
      if (!injector.signer?.signRaw) throw new Error("当前 Polkadot 钱包不支持 signRaw。");

      const signed = await injector.signer.signRaw({
        address,
        data: stringToHex(message),
        type: "bytes",
      });

      const walletSession = await client.createWalletSession({
        challengeId,
        ecosystem: "polkadot",
        address,
        signature: signed.signature,
      });
      const token = typeof walletSession.token === "string" ? walletSession.token : null;
      if (!token) throw new Error("Coordinator 未返回 wallet session token。");

      const next = readSession(walletSession);
      setWalletSessionToken(token, next?.expiresAt);
      setSession(next);
      markConnected();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Polkadot 钱包登录失败");
      throw cause;
    } finally {
      setBusy(false);
    }
  }, [client, connectPolkadot, markConnected, polkadotAddress]);

  const signWalletMessage = useCallback(async (message: string) => {
    setError(null);
    if (session?.ecosystem === "evm" || (!session && evmAddress)) {
      const normalizedAddress = evmAddress ?? (session?.ecosystem === "evm" ? session.address : undefined);
      if (!normalizedAddress) throw new Error("未获取到 EVM 地址。");
      return signMessageAsync({ message });
    }

    const address = polkadotAddress ?? (session?.ecosystem === "polkadot" ? session.address : undefined) ?? (await connectPolkadot());
    const [{ web3FromAddress }, { stringToHex }] = await Promise.all([
      import("@polkadot/extension-dapp"),
      import("@polkadot/util"),
    ]);
    const injector = await web3FromAddress(address);
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
    try {
      if (walletToken) await client.deleteWalletSession();
      clearWalletSessionToken();
      clearAuthState();
      setSession(null);
      if (evmAddress) await disconnectAsync();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "钱包会话注销失败");
      throw cause;
    } finally {
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
      loginWithEvm,
      loginWithPolkadot,
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
      logoutWallet,
      polkadotAddress,
      refreshSession,
      signWalletMessage,
      session,
      signingEvm,
    ],
  );
}
