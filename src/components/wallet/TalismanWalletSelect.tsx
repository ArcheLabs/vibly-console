"use client";

import { WalletSelect } from "@talismn/connect-components";
import type { WalletSelectProps } from "@talismn/connect-components";

export type TalismanWalletSelectProps = WalletSelectProps;

export function TalismanWalletSelect(props: TalismanWalletSelectProps) {
  return <WalletSelect {...props} />;
}
