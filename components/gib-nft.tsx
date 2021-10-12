import { Button, Card, Divider, Form, Input } from "antd";
import React, { useEffect, useState } from "react";
import styles from "../styles/Home.module.css";
import { DownloadOutlined } from "@ant-design/icons";
import { mintNFT } from "../util/mint-nft";
import { Avatar } from "./avatar";
import { Creator } from "../actions";
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from "../contexts/connection";

export default function GibNFT({ endpoint }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [creator, setCreator] = useState<Creator>();
  const connection = useConnection();
  const wallet = useWallet();
  const [nftCreateProgress, setNFTcreateProgress] = useState<number>(0)

  const mint = async () => {
    const { files, ...meta } = form.getFieldsValue();
    console.log({ meta, files });
    // return;
    setLoading(true);
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
            address: wallet.publicKey.toBase58(),
            share: 100,
            verified: true,
          }),
        ],
        animation_url: meta.animation_url || "",
        description: meta.description || "",
        image: (files as File[])[0].name,
        attributes: meta.attributes || [],
        external_url: meta.external_url || [],
        properties: {
          files: [
            {
              uri: (files as File[])[0].name,
              type: (files as File[])[0].type,
            },
          ],
        },
        sellerFeeBasisPoints: meta.attributes || 0,
      },
      setNFTcreateProgress,
      1
    );
    setLoading(false);
  };

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
      form.setFieldsValue({
        sellerFeeBasisPoints: 0,
        creators: [c],
      });
    }
  }, [creator, wallet?.publicKey, form]);

  const labelCol = { span: 5 };

  const [, forceUpdate] = useState({});

  // To disable submit button at the beginning.
  useEffect(() => {
    forceUpdate({});
  }, []);

  return (
    <>
      <p>
        Gib-NFT serves one purpose: To gib you NFT. It will generate an NFT from
        your metadata.
      </p>
      <Divider />
      <Card>
        <Form
          form={form}
          name="mint-nft"
          scrollToFirstError
          labelCol={labelCol}
          className={`${styles["full-width"]} ${styles["d-flex"]} ${styles["flex-col"]}`}
        >
          <label style={{ marginBottom: "2rem" }}>
            Please gib NFT metadata to mint.
          </label>
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
        <Form form={form} name="files">
          <Form.Item name="files">
            <Avatar setFile={setFile} />
          </Form.Item>
        </Form>
      </Card>
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
        {loading ? 'Create NFT' : nftCreateProgress}
      </Button>
    </>
  );
}
