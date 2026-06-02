import type { NetworkProfile } from "@/lib/network/profiles";

export function txExplorerUrl(profile: NetworkProfile, txHash: string): string | undefined {
  if (!profile.explorerTxUrl || !txHash) return undefined;
  return profile.explorerTxUrl.includes("{txHash}")
    ? profile.explorerTxUrl.replace("{txHash}", txHash)
    : `${profile.explorerTxUrl}${txHash}`;
}
