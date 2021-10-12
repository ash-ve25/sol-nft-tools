import { WalletProvider } from "../contexts/wallet";
import { AccountsProvider } from "../contexts/accounts/accounts";
import { ConnectionProvider } from "../contexts";
import { MenuStateProvider } from "../contexts/menu";
import { Meta } from "../components/meta";
import { Menu } from "../components/menu";
import {
  getPhantomWallet,
  getSolflareWallet,
  getLedgerWallet,
  getSolletWallet,
} from "@solana/wallet-adapter-wallets";

import { useMemo } from "react";
export default function Providers({ children }) {
  const wallets = useMemo(
    () => [
      getPhantomWallet(),
      getSolflareWallet(),
      getLedgerWallet(),
      getSolletWallet(),
    ],
    []
  );
  return (
    <ConnectionProvider>
      <WalletProvider wallets={wallets}>
        <AccountsProvider>
          <MenuStateProvider selectedKey="meta">
            <Meta></Meta>
            <Menu></Menu>
            {children}
          </MenuStateProvider>
        </AccountsProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
