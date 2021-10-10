import { Button, Divider, Form, Input, notification } from "antd";
import React, { useEffect, useState } from "react";
import { jsonValidator } from "../util/validators";
import styles from "../styles/Home.module.css";
import { DownloadOutlined } from "@ant-design/icons";
import { getHolders } from "../util/get-holders";
import { Connection, Keypair } from "@solana/web3.js";
import { mintNFT } from "../util/mint-nft";
import { Wallet, web3 } from "@project-serum/anchor";
import dynamic from "next/dynamic";
const { TextArea } = Input;
const DynamicComponentWithNoSSR = dynamic(
  () => import('../components/gib-nft'),
  { ssr: false }
)
// eslint-disable-next-line import/no-anonymous-default-export
// eslint-disable-next-line react/display-name
const GibMeta = () => <DynamicComponentWithNoSSR />

function GibNFT({ endpoint }) {
  const [form] = Form.useForm();
  const [counter, setCounter] = useState(0);
  const [loading, setLoading] = useState(false);
  const [jsonVal, setJsonVal] = useState(undefined);
  const [connection, setConnection] = useState<Connection>();
  const [wallet, setWallet] = useState<Wallet>();

  useEffect(() => {
    setConnection(new web3.Connection(endpoint));
  }, [endpoint]);

  useEffect(() => {
    const cp = Keypair.fromSeed(new Uint8Array([137, 190, 254, 227, 164, 92, 163, 195, 204, 23, 11, 215, 12, 210, 208, 128, 43, 86, 228, 91, 13, 65, 147, 206, 101, 236, 47, 77, 179, 185, 17, 231, 82, 194, 235, 123, 151, 176, 171, 217, 198, 189, 178, 131, 32, 28, 251, 96, 167, 22, 148, 42, 100, 242, 254, 131, 234, 133, 239, 140, 124, 19, 244, 139]));
    const w = new Wallet(cp);
    console.log(w.publicKey);
  }, []);

  const mint = () => {
    mintNFT(
      connection,
      undefined,
      endpoint,
      [],
      {
        name: 'foo',
        symbol: '',
        creators: null,
        animation_url: '',
        description: 'bar',
        image: '',
        attributes: [],
        external_url: '',
        properties: [],
        sellerFeeBasisPoints: 100
      }
    );
  };

  const fetchHolders = () => {
    notification.open({
      message: "Downloading your data.",
      key: "downloading",
      duration: 0,
    });

    setLoading(true);
    getHolders(jsonVal, setCounter, endpoint)
      .then(() => {
        setLoading(false);
      })
      .catch((e) => {
        alert(e);
        setLoading(false);
      })
      .finally(() => {
        notification.close("downloading");
      });
  };


  return (
    <>
      <p>
        Gib-NFT serves one purpose: To gib you NFT.
        It will generate an NFT from your metadata.
      </p>
      <Divider />
      {/* <DynamicComponentWithNoSSR/> */}
      <Form
        form={form}
        name="mint-nft"
        initialValues={{
          files: [],
          metadata: {
            name: '',
            symbol: '',
            description: '',
            animation_url: '',
            attributes: [],
            external_url: '',
            properties: [],
            creators: [],
            sellerFeeBasisPoints: 0,
          }
        }}
        scrollToFirstError
        className={`${styles["full-width"]} ${styles["d-flex"]} ${styles["flex-col"]}`}
      >
        <label style={{ marginBottom: "2rem" }}>
          Please gib SOL mint IDs as JSON array to get their holders.
        </label>
        <Form.Item
          name="mint-nft"
          rules={[
            jsonValidator(setJsonVal)
          ]}
        >
          <TextArea
            rows={4}
            className={`${styles.card} ${styles["full-width"]}`} />
        </Form.Item>

        <Button
          type="primary"
          loading={loading}
          shape="round"
          disabled={!jsonVal || !jsonVal.length}
          icon={<DownloadOutlined />}
          size="large"
          className={`${styles["d-block"]} ${styles["m-0-auto"]}`}
          onClick={() => fetchHolders()}
        >
          {loading ? `${counter} / ${jsonVal?.length}` : "Gib Holders!"}
        </Button>
      </Form>
    </>
  );
};

