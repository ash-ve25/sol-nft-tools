import { Button, Card, Divider, Form, Input } from "antd";
import React, { useCallback, useEffect, useState } from "react";
import styles from "../styles/Home.module.css";
import { DownloadOutlined } from "@ant-design/icons";
import { mintNFT } from "../util/mint-nft";
import { Avatar } from "./avatar";
import { Attribute, Creator } from "../actions";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "../contexts/connection";
import { CreatorsForm } from "./forms/creators";
import { ConnectButton } from "./connect-button";
import { AttributesForm, FieldData } from "./forms/attributes";

const formItemLayout = {
  labelCol: {
    xs: { span: 24 },
    sm: { span: 5 },
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 20 },
  },
};
const formItemLayoutWithOutLabel = {
  wrapperCol: {
    xs: { span: 24, offset: 0 },
    sm: { span: 20, offset: 5 },
  },
};

export default function GibNFT({ endpoint }) {
  const [form] = Form.useForm();
  const { connected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [creator, setCreator] = useState<Creator>();
  const connection = useConnection();
  const wallet = useWallet();
  const [nftCreateProgress, setNFTcreateProgress] = useState<number>(0);
  const labelCol = { span: 5 };
  const [, forceUpdate] = useState({});
  const [fields, setFields] = useState<FieldData[]>([]);

  const mint = useCallback(async () => {
    const { files, ...meta } = form.getFieldsValue();
    const res = await mintNFT(
      connection,
      wallet,
      endpoint,
      files,
      {
        name: meta.name || "",
        symbol: meta.symbol || "",
        creators: meta.creators || [
          new Creator({
            address: wallet!.publicKey!.toBase58(),
            share: 100,
            verified: true,
          }),
        ],
        animation_url: meta.animation_url || "",
        description: meta.description || "",
        image: (files as File[])[0].name,
        attributes: fields[0].value as Attribute[],
        external_url: meta.external_url || [],
        properties: {
          files: [
            {
              uri: (files as File[])[0].name,
              type: (files as File[])[0].type,
            },
          ],
        },
        sellerFeeBasisPoints: meta.sellerFeeBasisPoints || 0,
      },
      setNFTcreateProgress,
      1
    );
    setLoading(false);
    setNFTcreateProgress(0);
  }, [connection, endpoint, fields, form, wallet]);

  const setFile = (file) => {
    form.setFields([{ name: "files", value: [file] }]);
  };

  useEffect(() => {
    if (wallet?.publicKey && !creator) {
      const c = new Creator({
        address: wallet.publicKey.toBase58(),
        share: 100,
        verified: true,
      });
      setCreator(c);
    }
  }, [creator, wallet?.publicKey, form]);

  // To disable submit button at the beginning.
  useEffect(() => {
    forceUpdate({});
  }, [form]);

  const handleFields = useCallback((attrs) => {
    console.log(attrs);
    setFields(attrs);
  }, []);

  return (
    <>
      <p>
        Gib-NFT serves one purpose: To gib you NFT. It will generate an NFT from
        your metadata.
      </p>
      <Divider />
      <Card>
        {!connected && (
          <div>
            <h2 style={{ textAlign: "center" }}>Please Log in to begin</h2>

            <div style={{ textAlign: "center" }}>
              <ConnectButton />
            </div>
          </div>
        )}
        {connected && (
          <>
            <Form
              form={form}
              name="mint-nft"
              scrollToFirstError
              labelCol={labelCol}
              className={`${styles["full-width"]} ${styles["d-flex"]} ${styles["flex-col"]}`}
            >
              <h2 style={{ textAlign: "center" }}>Metadata</h2>
              <br />
              <Form.Item
                name="name"
                label="Name"
                rules={[{ required: true, message: "Please input a name!" }]}
              >
                <Input name="name" placeholder="Name" required />
              </Form.Item>
              <Form.Item name="symbol" label="Symbol">
                <Input name="symbol" placeholder="Symbol" />
              </Form.Item>
              <Form.Item name="description" label="Description">
                <Input name="description" placeholder="Description" />
              </Form.Item>
              <Form.Item name="external_url" label="External URL">
                <Input name="external_url" placeholder="External URL" />
              </Form.Item>
              <Form.Item name="sellerFeeBasisPoints" label="Resale Fee">
                <Input
                  name="sellerFeeBasisPoints"
                  placeholder="Resale Fee"
                  type="number"
                />
              </Form.Item>
            </Form>
            <AttributesForm fields={fields} onChange={handleFields} />
            <Form form={form} name="files">
              <Form.Item name="files">
                <Avatar setFile={setFile} />
              </Form.Item>
            </Form>
          </>
        )}
      </Card>
      {connected && (
        <Button
          type="primary"
          loading={loading}
          shape="round"
          icon={<DownloadOutlined />}
          size="large"
          className={`${styles["d-block"]} ${styles["m-0-auto"]}`}
          onClick={() => mint()}
          style={{ marginTop: "2rem" }}
        >
          {!loading ? "Create NFT" : `${nftCreateProgress} / 8 Steps done`}
        </Button>
      )}
    </>
  );
}
