import { WalletProvider } from "../contexts/wallet";
import { AccountsProvider } from "../contexts/accounts/accounts";
import { ConnectionProvider } from "../contexts";
import { MenuStateProvider } from "../contexts/menu";
import { Meta } from "../components/meta";
import { Menu } from "../components/menu";
export default function Providers({ children }) {
  return (
    <ConnectionProvider>
      <WalletProvider>
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
