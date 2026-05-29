const APP_NAME = "Vibly Console";
const UNAUTHORIZED_SOURCE_PATTERN = /has not been authorized yet/i;

function normalizePolkadotExtensionError(cause: unknown, address?: string): Error {
  const message = cause instanceof Error ? cause.message : String(cause ?? "");
  if (UNAUTHORIZED_SOURCE_PATTERN.test(message)) {
    return new Error(
      address
        ? `当前页面尚未在 Polkadot 钱包扩展中授权账号 ${address}。请先在扩展中授权此站点，再重新连接钱包后重试。`
        : "当前页面尚未在 Polkadot 钱包扩展中授权。请先在扩展中授权此站点，再重新连接钱包后重试。",
    );
  }
  return cause instanceof Error ? cause : new Error(message || "Polkadot 钱包扩展调用失败");
}

export async function getAuthorizedPolkadotAccounts() {
  try {
    const { web3Accounts, web3Enable } = await import("@polkadot/extension-dapp");
    const extensions = await web3Enable(APP_NAME);
    if (!extensions.length) throw new Error("未检测到 Polkadot 钱包扩展。");
    const accounts = await web3Accounts();
    if (!accounts.length) {
      throw new Error("Polkadot 钱包中没有可用账号，或当前页面尚未在扩展中授权。");
    }
    return accounts;
  } catch (cause) {
    throw normalizePolkadotExtensionError(cause);
  }
}

export async function getAuthorizedPolkadotAddress(preferredAddress?: string): Promise<string> {
  const accounts = await getAuthorizedPolkadotAccounts();
  if (!preferredAddress) return accounts[0]?.address ?? "";
  if (accounts.some((account) => account.address === preferredAddress)) return preferredAddress;
  throw new Error(`当前页面尚未在 Polkadot 钱包扩展中授权账号 ${preferredAddress}。请先在扩展中授权此站点，再重新连接钱包后重试。`);
}

export async function getAuthorizedPolkadotInjector(address: string) {
  try {
    const authorizedAddress = await getAuthorizedPolkadotAddress(address);
    const { web3FromAddress } = await import("@polkadot/extension-dapp");
    return await web3FromAddress(authorizedAddress);
  } catch (cause) {
    throw normalizePolkadotExtensionError(cause, address);
  }
}