import styles from "../styles/Home.module.css";
import { Button, Menu as AntdMenu, Layout } from "antd";
import { CurrentUserBadge } from "../components/current-user-badge";
import { ConnectButton } from "../components/connect-button";
import { useRouter } from "next/router";
import { useWallet } from "@solana/wallet-adapter-react";
import { useMenuState } from "../contexts/menu";
const { Header } = Layout;

export function Menu() {
  const router = useRouter();
  const { connected, wallet, disconnect } = useWallet();

  const { selectedKeys, setSelectedKeys } = useMenuState();
  const setRoute = (route) => {
    router.push({ query: { mode: route } });
    setSelectedKeys([route]);
  };

  return (
    <Header className={styles.header}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-horizontal-gradient-dark.svg"
        alt="Solana Logo"
        className={styles["sol-logo"]}
      />
      <AntdMenu
        className={styles.menu}
        mode="horizontal"
        selectedKeys={selectedKeys}
      >
        <AntdMenu.Item onClick={() => setRoute("mints")} key="mints">
          Gib Mints
        </AntdMenu.Item>
        <AntdMenu.Item onClick={() => setRoute("meta")} key="meta">
          Gib Meta
        </AntdMenu.Item>
        <AntdMenu.Item onClick={() => setRoute("holders")} key="holders">
          Gib Holders
        </AntdMenu.Item>
        <AntdMenu.Item onClick={() => setRoute("ar-links")} key="ar-links">
          Gib AR-Links (Beta)
        </AntdMenu.Item>
        <AntdMenu.Item
          onClick={() => setRoute("nft")}
          key="nft"
        >
          Gib NFTs (Beta)
        </AntdMenu.Item>
        <AntdMenu.Item
          onClick={() => setRoute("airdrop")}
          style={{ marginRight: "auto" }}
          key="airdrop"
        >
          Gib Airdrop
        </AntdMenu.Item>
      </AntdMenu>

      <div
        style={{
          minWidth: "320px",
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-end",
        }}
      >
        {wallet?.name && !connected && (
          <Button onClick={() => disconnect().catch()}>
            Disconnect {wallet.name}
          </Button>
        )}
        {!connected && <ConnectButton />}
        {connected && <CurrentUserBadge showBalance showAddress />}
      </div>
    </Header>
  );
}
