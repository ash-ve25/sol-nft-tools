import { Divider, notification } from "antd";
import React from "react";
import { GibHolders } from "../components/gib-holders";
import { GibMints } from "../components/gib-mints";
import { GibMeta } from "../components/gib-meta";
import GibNft from '../components/gib-nft';
import styles from "../styles/Home.module.css";
import dynamic from "next/dynamic";
import { useMenuState } from "../contexts/menu";

const GibNftNoSSR = dynamic(
  () => import("../components/gib-nft"),
  { ssr: false }
);
const GibAirdropNoSSR = dynamic(
  () => import("../components/gib-airdrop"),
  { ssr: false }
);
export default function Home() {
  const { selectedKeys } = useMenuState();
  const copyAddress = () => {
    navigator.clipboard.writeText(
      "DSmbnj9t7CCQdAZfvYe3PNbJB7CrVXpa29iW3VkgpEEZ"
    );
    notification.open({
      message: "Copied to clipboard!",
      duration: 2000,
    });
  };

  const endpoint = "https://api.metaplex.solana.com";

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h2 className={styles.title}>{`GIB ${
          selectedKeys && selectedKeys[0].toUpperCase()
        }!`}</h2>
        <div className={styles["inner-container"]}>
          <Divider />

          {selectedKeys && selectedKeys[0] === "nft" && (
            <GibNftNoSSR endpoint={endpoint} />
          )}
          {selectedKeys && selectedKeys[0] === "meta" && (
            <GibMeta endpoint={endpoint} />
          )}
          {selectedKeys && selectedKeys[0] === "holders" && (
            <GibHolders endpoint={endpoint} />
          )}
          {selectedKeys && selectedKeys[0] === "mints" && (
            <GibMints endpoint={endpoint} />
          )}
          {selectedKeys && selectedKeys[0] === "airdrop" && (
            <GibAirdropNoSSR endpoint={endpoint} />
          )}
        </div>
      </main>
      <footer className={styles.footer}>
        <span style={{ width: "100%" }}>
          <span>
            Made by
            <a
              style={{ display: "block" }}
              target="_blank"
              rel="noreferrer"
              href="https://y.at/%E2%99%A0%E2%9D%A4%F0%9F%90%B0%F0%9F%90%B1"
            >
              Alice{" "}
            </a>
          </span>
        </span>
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            gap: 32,
          }}
        >
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://github.com/21e8/sol-nft-tools"
          >
            <i
              className="fab fa-github"
              style={{ fontStyle: "normal", fontSize: 24 }}
            ></i>
          </a>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://twitter.com/0xAlice_"
          >
            <i
              className="fab fa-twitter"
              style={{ fontStyle: "normal", fontSize: 24 }}
            ></i>
          </a>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://discord.gg/JAU4e7Zf"
          >
            <i
              className="fab fa-discord"
              style={{ fontStyle: "normal", fontSize: 24 }}
            ></i>
          </a>
        </div>
        <span style={{ width: "100%" }} className={styles["text-right"]}>
          Tip Address (SOL) <br />
          <span
            onClick={() => copyAddress()}
            className={styles["cursor-pointer"]}
          >
            DSmbnj9t7CCQdAZfvYe3PNbJB7CrVXpa29iW3VkgpEEZ
          </span>
        </span>
      </footer>
    </div>
  );
}
