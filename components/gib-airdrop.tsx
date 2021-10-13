import { Button, Card, Divider, Form, Input, notification, Spin } from "antd";
import React, { useCallback, useEffect, useState } from "react";
import styles from "../styles/Home.module.css";
import { DownloadOutlined } from "@ant-design/icons";
import { mintNFT } from "./util/mint-nft-anchor";
import { Avatar } from "./avatar";
import { Attribute, Creator } from "../actions";
import { useConnection } from "../contexts/connection";
import { AttributesForm, FieldData } from "./forms/attributes";
import { Wallet } from "@project-serum/anchor";
import jsonFormat from "json-format";
import { fileToBuffer, generateArweaveWallet, getARInstance, getKeyForJwk, uploadToArweave } from "./util/arweave";
import { download } from "./util/download";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { FileUpload } from "./file-upload";
import { JWKInterface } from "arweave/node/lib/wallet";

const arweave = getARInstance();


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

export default function GibAirdrop({ endpoint }) {
  const [form] = Form.useForm();
  const [loginForm] = Form.useForm();
  // const { wallet } = useWallet();
  const [wallet, setWallet] = useState<Wallet>();
  const [loading, setLoading] = useState(false);
  const [creator, setCreator] = useState<Creator>();
  const connection = useConnection();
  // const wallet = useWallet();
  const [nftCreateProgress, setNFTcreateProgress] = useState<number>(0);
  const labelCol = { span: 5 };
  const [, forceUpdate] = useState({});
  const [fields, setFields] = useState<FieldData[]>([]);
  const [address, setAddress] = useState<string>();
  const [balance, setBalance] = useState("none");
  const [files, setFiles] = useState([]);
  
  const mint = useCallback(async () => {
    const { files: _files, ...meta } = form.getFieldsValue();
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
  }, [connection, endpoint, files, fields, form, wallet]);

  const setFile = (file) => {
    form.setFields([{ name: "files", value: [file] }]);
  };
  const [jwk, setJwk] = useState<JWKInterface>();

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

  const upload = async () => {
    setLoading(true);
    const { files, ...meta } = form.getFieldsValue();
    
    const res = await Promise.all(
      (files as File[]).map(async (f) => {
        const transaction = await arweave.createTransaction(
          { data: await fileToBuffer(f) },
          jwk
        );
        transaction.addTag("Content-Type", f.type);
        await arweave.transactions.sign(transaction, jwk);
        await uploadToArweave(transaction);
        return {
          link: `https://arweave.net/${transaction.id}`,
          name: f.name,
        };
      })
    );

    setLoading(false);
    download(`AR-upload-${Date.now()}.json`, jsonFormat(res));
  };


  useEffect(() => {
    const generate = () =>
      generateArweaveWallet().then(async (jwk) => {
        setJwk(jwk);
        const address = await getKeyForJwk(jwk);
        setAddress(address);
      });

    const previousKey = localStorage.getItem("arweave-key");
    if (previousKey) {
      if (!address) {
        try {
          const k = JSON.parse(previousKey);
          setJwk(k);
          getKeyForJwk(k).then((address) => {
            setAddress(address);
          });
        } catch (e) {
          console.log(e);
          generate();
        }
      }
    } else {
      generate();
    }
  }, [address, jwk]);

  useEffect(() => {
    try {
      const previousKey = localStorage.getItem('airdrop-privkey');
      const parsed = JSON.parse(previousKey);
      const wallet = new Wallet(parsed);
      setWallet(wallet);
    } catch (e) {
      notification.open({message: `Could not retrieve previous privkey: ${JSON.stringify(e)}`})
    }
  }, [form]);

  const handleFields = useCallback((attrs) => {
    console.log(attrs);
    setFields(attrs);
  }, []);

  const handleFiles = async (_files: File[]) => {
    const loaded = await Promise.all(_files.map((f) => fileToBuffer(f)));
    setFiles(loaded);
  };

  return (
    <>
      <p>
        Gib-NFT serves one purpose: To gib you NFT. It will generate an NFT from
        your metadata.
      </p>
      <Divider />
      <Card>
        {!wallet && (
          <div>
            <h2 style={{ textAlign: "center" }}>Please login with private key to begin</h2>

            <Form form={loginForm}>
              <Form.Item name="privkey" rules={[{required: true, message: 'Please enter private key'}]}>
                <Input />
              </Form.Item>
              <Form.Item style={{textAlign: 'center'}}>
                <Button onClick={() => {
                  localStorage.setItem('airdrop-privkey', JSON.stringify(loginForm.getFieldsValue().privkey))
                }}>Connect</Button>
              </Form.Item>
            </Form>
          </div>
          // </div>
        )}
        {wallet && (
          <>
            <Form
              form={form}
              name="mint-nft"
              scrollToFirstError
              labelCol={labelCol}
              className={`${styles["full-width"]} ${styles["d-flex"]} ${styles["flex-col"]}`}
            >
              <h2 style={{ textAlign: "center" }}>1. Create Metadata</h2>
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

            <Card
          extra={
            <>
              <CopyToClipboard
                text={address}
                onCopy={() =>
                  notification.open({ message: "Copied to clipboard!" })
                }
              >
                <a style={{ marginRight: "1rem" }}>Copy Address</a>
              </CopyToClipboard>
              <a
                onClick={() => download(`AR-${address}.json`, jsonFormat(jwk))}
              >
                Download Wallet
              </a>
            </>
          }
          title="Wallet"
        >
          <p>Address: {address}</p>
          <p>
            Balance:{" "}
            {balance === "none" ? (
              <Spin style={{ marginLeft: "1rem" }} />
            ) : (
              balance
            )}
          </p>
          <Divider />
          <FileUpload setFiles={handleFiles} />
        </Card>
            {wallet && (
              <Button
                type="primary"
                loading={loading}
                shape="round"
                icon={<DownloadOutlined />}
                size="large"
                className={`${styles["d-block"]} ${styles["m-0-auto"]}`}
                onClick={() => {}}
                style={{ marginTop: "2rem" }}
              >
                Upload
              </Button>
            )}
          </>
        )}
      </Card>
    </>
  );
}
