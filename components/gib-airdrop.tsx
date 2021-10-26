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
import {
  fileToBuffer,
  generateArweaveWallet,
  getARInstance,
  getKeyForJwk,
  uploadToArweave,
} from "./util/arweave";
import { download } from "./util/download";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { FileUpload } from "./file-upload";
import { JWKInterface } from "arweave/node/lib/wallet";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { jsonValidator } from "./util/validators";
import { mintAndSend } from "./util/mint-nft";

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
  const [arweaveAddress, setArweaveAddress] = useState<string>();
  const [balance, setBalance] = useState("none");
  const [files, setFiles] = useState([]);
  const [privkey, setPrivkey] = useState();
  const [jwk, setJwk] = useState<JWKInterface>();
  const [solBalance, setSolBalance] = useState<number | 'none'>('none');
  const [arData, setArData] = useState<any>('YjHeQxupl2ezEiGvu3BzXWPDiQBI-eAnGDboMo6UCwQ');
  const [recipients, setRecipients] = useState([]);

  const handleSetPrivkey = useCallback(() => {
    localStorage.setItem("airdrop-privkey", loginForm.getFieldsValue().privkey);
    const parsed = JSON.parse(loginForm.getFieldsValue().privkey);
    const wallet = new Wallet(parsed);
    setWallet(wallet);
  }, [loginForm]);

  const generate = () =>
    generateArweaveWallet().then(async (jwk) => {
      setJwk(jwk);
      const a = await getKeyForJwk(jwk);
      setArweaveAddress(a);
    });

  useEffect(() => {
    const previousKey = localStorage.getItem("arweave-key");
    if (previousKey) {
      if (!arweaveAddress) {
        try {
          const k = JSON.parse(previousKey);
          setJwk(k);
          getKeyForJwk(k).then((a) => {
            setArweaveAddress(a);
          });
        } catch (e) {
          console.log(e);
          generate();
        }
      }
    }
  }, [arweaveAddress, jwk]);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (arweaveAddress) {
        const balance = await arweave.wallets.getBalance(arweaveAddress);
        setBalance(arweave.ar.winstonToAr(balance));
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [arweaveAddress, balance]);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (arweaveAddress) {
        const b = await arweave.wallets.getBalance(arweaveAddress);
        setBalance(arweave.ar.winstonToAr(b));
      }
      if (wallet?.publicKey) {
        connection.getBalance(wallet?.publicKey).then((b) => setSolBalance(b))
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [arweaveAddress, balance, connection, wallet?.publicKey]);

  useEffect(() => {
    try {
      const previousKey = localStorage.getItem("airdrop-privkey");
      if (previousKey) {
        const parsed = JSON.parse(previousKey);
        const keypair = Keypair.fromSecretKey(new Uint8Array(parsed));
        const { publicKey } = keypair;
        setWallet(new Wallet(keypair));
        const pubkeyAsString = publicKey.toBase58();
        connection.getBalance(publicKey).then((b) => setSolBalance(b));
        if (pubkeyAsString && !creator) {
          const c = new Creator({
            address: pubkeyAsString,
            share: 100,
            verified: true,
          });
          setCreator(c);
        }
      }
    } catch (e) {
      notification.open({
        message: `Could not retrieve previous privkey: ${e}`,
      });
    }
  }, [connection, creator]);


  // wallet.signTransaction
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

  // const pubkeyAsString = wallet && wallet?.publicKey && wallet?.publicKey?.toBase58();
  // useEffect(() => {
  //   if (pubkeyAsString && !creator) {
  //     const c = new Creator({
  //       address: pubkeyAsString,
  //       share: 100,
  //       verified: true,
  //     });
  //     setCreator(c);
  //   }
  // }, [creator, pubkeyAsString, form]);

  // To disable submit button at the beginning.
  useEffect(() => {
    forceUpdate({});
  }, [form]);

  const upload = useCallback(async () => {
    setLoading(true);
    const { files, ...meta } = form.getFieldsValue();

    const res = await Promise.all(
      (files as File[]).map(async (f) => {
        const m = Object.assign({
          name: meta.name,
          symbol: meta.symbol || null,
          description: meta.description || null,
          seller_fee_basis_points: meta.sellerFeeBasisPoints || null,
          image: meta.image || null,
          animation_url: meta.animation_url || null,
          attributes: meta.attributes || null,
          external_url: meta.external_url || null,
          properties: {
            ...meta.properties,
            creators: new Creator({ 
              address: wallet?.publicKey.toBase58(),
              share: 100,
              verified: true 
            }),
          },
        });
        const imgTx = await arweave.createTransaction(
          { data: await (await fileToBuffer(f)).buffer },
          jwk
        );
        imgTx.addTag("Content-Type", f.type);
        await arweave.transactions.sign(imgTx, jwk);
        await uploadToArweave(imgTx);
        const imgLink =  `https://arweave.net/${imgTx.id}`;
        m.image =  imgLink;
        m.properties.files = [{ type: f.type, uri: imgLink }]
        const metaTx =  await arweave.createTransaction(
          { data: JSON.stringify({...m}) },
          jwk
        );
        metaTx.addTag("Content-Type", 'application/json');
        await arweave.transactions.sign(metaTx, jwk);
        await uploadToArweave(metaTx);

        return metaTx.id;
      })
    );

    setArData(res[0]);
    setLoading(false);
  }, [form, jwk, wallet?.publicKey]);

  useEffect(() => {
    const generate = () =>
      generateArweaveWallet().then(async (jwk) => {
        setJwk(jwk);
        const address = await getKeyForJwk(jwk);
        setArweaveAddress(address);
      });

    const previousKey = localStorage.getItem("arweave-key");
    if (previousKey) {
      if (!arweaveAddress) {
        try {
          const k = JSON.parse(previousKey);
          setJwk(k);
          getKeyForJwk(k).then((address) => {
            setArweaveAddress(address);
          });
        } catch (e) {
          console.log(e);
          generate();
        }
      }
    } else {
      generate();
    }
  }, [arweaveAddress, jwk]);

  const handleSned = useCallback(async () => {
   const txid =  await mintAndSend({
      connection,
      wallet,
      publicKey: 'FTwADibN8jnndAFM7iJDksYqfioPBEXBUxoZRJfSi5KQ'
    });

    debugger

  }, [connection, wallet]);

  const handleFields = useCallback((attrs) => {
    console.log(attrs);
    setFields(attrs);
  }, []);

  const handleFiles = async (_files: File[]) => {
    const loaded = await Promise.all(_files.map((f) => fileToBuffer(f)));
    setFiles(loaded);
  };

  const downloadSolKey = useCallback(() => {
    const cachedKey = localStorage.getItem("airdrop-privkey");
    if (!cachedKey) {
      return;
    }
    download(`SOL-${wallet?.publicKey.toBase58()}.json`, cachedKey);
  }, [wallet?.publicKey]);

  const handleDownloadARKey = useCallback(() => {
    if (!jwk) {
      return;
    }
    download(`AR-${arweaveAddress}.json`, jsonFormat(jwk));
  }, [arweaveAddress, jwk]);

  const clipboardNotification = useCallback(() => {
    notification.open({ message: "Copied to clipboard!" });
  }, []);

  return (
    <>
      <Divider />

      {wallet && (
        <Card
          extra={
            !privkey && (
              <>
                <CopyToClipboard
                  text={wallet?.publicKey.toBase58()}
                  onCopy={clipboardNotification}
                >
                  <a style={{ marginRight: "1rem" }}>Copy Address</a>
                </CopyToClipboard>
                <a onClick={downloadSolKey}>Download Wallet</a>
              </>
            )
          }
          title="SOL Wallet"
        >
          <p>Address: {wallet?.publicKey.toBase58()}</p>
          <p>
            Balance:{" "}
            {solBalance === "none" ? (
              <Spin style={{ marginLeft: "1rem" }} />
            ) : (
              solBalance / LAMPORTS_PER_SOL
            )}
          </p>
        </Card>
      )}

      <Card
        extra={
          <>
            <CopyToClipboard
              text={arweaveAddress}
              onCopy={clipboardNotification}
            >
              <a style={{ marginRight: "1rem" }}>Copy Address</a>
            </CopyToClipboard>
            <a onClick={handleDownloadARKey}>Download Wallet</a>
          </>
        }
        title="AR Wallet"
      >
        <p>Address: {arweaveAddress}</p>
        <p>
          Balance:{" "}
          {balance === "none" ? (
            <Spin style={{ marginLeft: "1rem" }} />
          ) : (
            balance
          )}
        </p>
      </Card>
      <Card>
        {!wallet && (
          <div>
            <h2 style={{ textAlign: "center" }}>
              Please login with private key to begin
            </h2>

            <Form form={loginForm}>
              <Form.Item
                name="privkey"
                rules={[
                  { required: true, message: "Please enter private key" },
                ]}
              >
                <Input />
              </Form.Item>
              <Form.Item style={{ textAlign: "center" }}>
                <Button onClick={handleSetPrivkey}>Connect</Button>
              </Form.Item>
            </Form>
          </div>
        )}
        {wallet && !arData && (
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

            {wallet && (
              <Button
                type="primary"
                loading={loading}
                shape="round"
                icon={<DownloadOutlined />}
                size="large"
                className={`${styles["d-block"]} ${styles["m-0-auto"]}`}
                onClick={upload}
                style={{ marginTop: "2rem" }}
              >
                Upload
              </Button>
            )}
          </>
        )}

        {wallet && arData && (
         <>
          <h2>Step 2: Sned</h2>
          <p>
            AR Link: {arData}
          </p>

          <div>Gib list with all addresses</div>
          <Form.Item name="mintIds" rules={[jsonValidator(setRecipients)]}>
          <Input.TextArea
              rows={4}
              className={`${styles.card} ${styles["full-width"]}`}
            />
          </Form.Item>
          <Form.Item style={{ textAlign: "center" }}>
            <Button onClick={handleSned}>Connect</Button>
          </Form.Item>
         </>
        )}
      </Card>
    </>
  );
}
