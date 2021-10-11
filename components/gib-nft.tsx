import { Button, Card, Divider, Form, Input, notification } from "antd";
import React, { useEffect, useState } from "react";
import { jsonValidator } from "../util/validators";
import styles from "../styles/Home.module.css";
import { DownloadOutlined } from "@ant-design/icons";
import { getHolders } from "../util/get-holders";
import { Connection, Keypair } from "@solana/web3.js";
import { mintNFT } from "../util/mint-nft";
import { Wallet, web3 } from "@project-serum/anchor";
const { TextArea } = Input;
export default function GibNFT({ endpoint }) {
  const [form] = Form.useForm();
  const [counter, setCounter] = useState(0);
  const [loading, setLoading] = useState(false);
  const [jsonVal, setJsonVal] = useState(undefined);
  const [connection, setConnection] = useState<Connection>();
  const [wallet, setWallet] = useState<Wallet>();

  useEffect(() => {
    if (endpoint) {
      setConnection(new web3.Connection(endpoint));
    }
  }, [endpoint]);

  useEffect(() => {
    const cp = Keypair.fromSecretKey(new Uint8Array([137, 190, 254, 227, 164, 92, 163, 195, 204, 23, 11, 215, 12, 210, 208, 128, 43, 86, 228, 91, 13, 65, 147, 206, 101, 236, 47, 77, 179, 185, 17, 231, 82, 194, 235, 123, 151, 176, 171, 217, 198, 189, 178, 131, 32, 28, 251, 96, 167, 22, 148, 42, 100, 242, 254, 131, 234, 133, 239, 140, 124, 19, 244, 139]));
    const w = new Wallet(cp);
    console.log(w.publicKey)
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
            creators: null,
            sellerFeeBasisPoints: 0,
          }
        }}
        scrollToFirstError
        className={`${styles["full-width"]} ${styles["d-flex"]} ${styles["flex-col"]}`}
      >
        <label style={{ marginBottom: "2rem" }}>
          Please gib NFT metadata to mint.
        </label>
        <Card>
          <Form.Item
            name="name"
            rules={[
              // jsonValidator(setJsonVal)
            ]}
          >
            <Input name='name' placeholder="Name"/>
            <br />
            <br />
            <Input name='symbol' placeholder="Symbol"/>
            <br />
            <br />
            <Input name='description' placeholder="Description"/>
            <br />
            <br />
            <Input name='animation_url' placeholder="Animation URL"/>
            <br />
            <br />
            <Input name='external_url' placeholder="External URL"/>
          </Form.Item>
        </Card>

        <Button
          type="primary"
          loading={loading}
          shape="round"
          // disabled={!jsonVal || !jsonVal.length}
          icon={<DownloadOutlined />}
          size="large"
          className={`${styles["d-block"]} ${styles["m-0-auto"]}`}
          onClick={() => console.log(form.getFieldsValue())}
        >
          {loading ? `${counter} / ${jsonVal?.length}` : "Gib Holders!"}
        </Button>
      </Form>
    </>
  );
};

