import { Button, Card, Divider, Form, Input, notification, Spin } from "antd";
import React, { useCallback, useEffect, useState } from "react";
import styles from "../styles/Home.module.css";
import { Avatar } from "./avatar";
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
import { toPublicKey } from "../utils";
import { mintNFT } from "./util/mint";
import { Creator, Data } from "./util/mint/schema";
import { DownloadOutlined } from "@ant-design/icons";
import { concatMap, from, map, toArray } from "rxjs";

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
  const [mintIdForm] = Form.useForm();
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
  const [solBalance, setSolBalance] = useState<number | "none">("none");
  const [arData, setArData] = useState<any>("");
  const [recipients, setRecipients] = useState([]);
  const [nftMeta, setNftMeta] = useState<any>();

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
        connection.getBalance(wallet?.publicKey).then((b) => setSolBalance(b));
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
            verified: 1,
          });
          setCreator(c);
        }
      } else {
        const keypair = new Keypair();
        const wallet = new Wallet(keypair);
        const c = new Creator({
          address: wallet.publicKey.toBase58(),
          share: 100,
          verified: 1,
        });
        setCreator(c);
      }
    } catch (e) {
      notification.open({
        message: `Could not retrieve previous privkey: ${e}`,
      });
    }
  }, [connection, creator]);

  const mint = useCallback(async () => {
    setLoading(true);
    notification.open({ message: "Dropping!", key: "dropping" });
    const creators = [
      new Creator({
        address: wallet.publicKey.toString(),
        share: 100,
        verified: 1,
      }),
    ];

    const { files: _files } = form.getFieldsValue();
    const data = new Data({
      symbol: nftMeta.symbol || "",
      name: nftMeta.name || "",
      uri: arData,
      sellerFeeBasisPoints: Number.isNaN(+nftMeta.sellerFeeBasisPoints)
        ? +nftMeta.sellerFeeBasisPoints
        : 0,
      creators,
    });

    const addresses = JSON.parse(mintIdForm.getFieldValue("mintIds"));

    from(addresses)
      .pipe(
        concatMap((address: string) =>
          from(
            mintNFT(connection, wallet.payer, toPublicKey(address), data)
          ).pipe(map((txId) => ({ txId, address })))
        ),
        toArray()
      )
      .subscribe((res) => {
        download(`Airdrop-${nftMeta.name}-${Date.now()}.json`, jsonFormat(res));
        setLoading(false);
        notification.close("dropping");
      });

    setLoading(false);
    setNFTcreateProgress(0);
  }, [connection, endpoint, fields, form, wallet, nftMeta, arData, loading]);

  const setFile = (file) => {
    form.setFields([{ name: "files", value: [file] }]);
  };

  useEffect(() => {
    forceUpdate({});
  }, [form]);

  const upload = useCallback(async () => {
    setLoading(true);
    const { files, ...meta } = form.getFieldsValue();

    setNftMeta(meta);

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
              verified: 1,
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
        const imgLink = `https://arweave.net/${imgTx.id}`;
        m.image = imgLink;
        m.properties.files = [{ type: f.type, uri: imgLink }];
        const metaTx = await arweave.createTransaction(
          { data: JSON.stringify({ ...m }) },
          jwk
        );
        metaTx.addTag("Content-Type", "application/json");
        await arweave.transactions.sign(metaTx, jwk);
        await uploadToArweave(metaTx);

        return `https://arweave.net/${metaTx.id}`;
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

    const previousKey = localStorage.getItem("arweave-key") || '{"kty":"RSA","e":"AQAB","n":"w7YG7I15scQzma_J8schRscNRYpnKG3WC8czG2Ci-TM6YRlaWqzbgrOrkiiN4AV5T2FYAjDQglPPuidAepJRyQIUEuwGqiaszP7xPbmvjZqXsvnjItjsWEcVmxuTJ7T_g_aP6D05Lz4Dn7xbRltRM79jL3dZbRV_5kMp0sk4Ex-QIZqvCmkZC2TooIl5abkxZHbHUSPKmeL9Q3GKAf5-_cvAGFEL2HVQ_7CWE-9N92Nn7I2uRGQOGzMtPtzsQye82_U-cfo_0pOx7X0M0qY7aLgVyvryzcrMrBIP5T02R3uaq6BMZTuEtdhDEo4Y3U9UkAuwSVuWzrdJOCULszsuNzBCiMZbW5tSVZxobtkw89wTC9HuE6O5v1tCX84yT59imcJ_hq9vZpJ-DdMJaUyVs-Xkj50lQ8sck9LgnCRC6vO2o5CHwrufqWFDa2V-MvcQCm00yanXlsfh_aQBaq1vqF1bW-FQokDDlnnEvXc2K0Cx_EA6aSImCXo5weJHokAIxjpWw0aqlty8L5iAbsf23qgiRteuUoUo5yUaiCyaE2Nxu53Z4XWFQ-mDD2UfH3VFzPfjNmTq6gC41nSe9LUp101saYTAHMgrvXYJNBObVPrnzNX4GHE5oTFA15mYG4iMglV2wSTrqtFiaPHhfqLGMD_y2pjix2dN3Nu7F-cQuXU","d":"B9TcYRHmOUFXKUK6C4-BWuIzO0GnEByZEJ6XgnRzARLWNrV7gp5hKFFFP9OEnd7KNG16Rpgqd9Sfvty8PUtmn2sIX5t3Rs7GYmufPq-UAVAa2uwZ9TaF-qBZknvffxrEkMTIjGwKwkOyhG1Wn7GexbnWX7tgZjeShyXP4iHwLv-31kho0btT57tRfb8SjzL8cX85SZtri43kQZMlCSBkd4Z0OOThWveS1rB7yO9uCMS_D126B_2S_O6m1Fml0Kgh7BFbvtbbP_NuDslOvo0tWmrnYFh7Z9XCK-6LGUrCRckB7vU6qWBg1qABSxhJkW2PvjXhh4X1Om9mLCt7VOA84KFxL8Uwy-DsY2PpBPuLxrloWOpFNxYnfKEWR2txOXla3UvoqZhZOJs1Yc0SGdvwzocwptzCogkeNwWi1EAaYi-nC6wKkZP98zBiYwO4STlDEsNSC7LC82kgaL4LnFz-Gh2nIjuhkeNtm0YvnUplCoKbgvGzleZrqkeILKR41uRFVu6gaJ4RcFxdj9ApqeQkq8DS1LM1_wd4ja1zbwNHkT2P8PnRtGRqRwKaf6nXgZS01YfVK20QSeZpJRsPoOGyFqMfMiaTRp9i8dBL4A4c0BqlQxQKZSTf8_t7srG0ovbBi1zcwRD7GrMWk51dZQ90Px_Wlkzugg5lER4vqhyigJ8","p":"--tM9Vcl8t7Ln_crV29C53y5aX7ANSB27YeK7V4dZ6qzrqDZV306Rg0YqIWC4jVmP4hnuT5JqE-l8txqz_xgPacSrQQrcwHt6VE4Ccl797Tm3JH1TT9JBdZHG3ex24jY-BFjMe9jkJZYR96utl3NMfZBlxgRpua9Ik4PA8ZSvzrqxAInUw2Q9hQhN5rPxO6W619N9UiKaIft426az-dI0Ed6LswmZZ67DPyPzPE26sI0MxQSIxBzu3GQebW83oW7yh2sTEyAnW1qBcg-X0CBe3BYzpKBcLpCEmecNq1mNJwfT8-yGX2ORB-GD0I_OiJ3cna7lupe2Gegrf0QcCytiw","q":"xuGiLf1rIWvYcNv4I-vu05Xy4OGZrhdgSenVWD-6rZs7wiso0-Nv9DJiZ2OMBLEujyiPa-IEwG1ZRKAAChLf1FkjKLNpWVrMX1bad73Md-67qYwIwH28NC1nUl__7HTt-UBqh3lONZ6OaEg2rXwUfSLCNIcrgSWOgiT7lFFxXYq51igrc1bkcALGBcYibEHV3i_pBH7Yg8C7we3e8VxmBFV_ASsXvM_lEnUxtjqOqgD2XfNIjEPkQ-hKZs2yHuFg2V-Aq_B9ytQTLuGBTDXn52SK4_bsV2pyW3Ny_RH7hlt1-AYL_t6lZEi5NWZxKMSo7oHqcHFCWcin7EM_OSMU_w","dp":"TJYYa233J4L8PMGT95znpiCQ7bWPEZexED1oywkVv3Jx9eEIskRr9uf8Wx9bzxGU6DO79OEu23B7bv37qwd66sNkNh1SaEBp58i9VJxgh8oDdYMaJEXdGV0vePZGqAtOivweQAwbJNXQOOlGDEMwIsRO5HR4yVjUnx1EC0270k9DGBvfgKxbKbSs9I6oI6K1VxE-ThejnGvWspHpltMlm8xfJOMDuVksXKJbxV5_55bq76xmZyqVRKMd3SKXLL9Te_rRatDHORUOanuaGrMtqi1ZklOP7olxlM7S-vx0WgIsssLdzkoRejxrMTBesHnR_oaCOTs_YmL-wmZxHOk4SQ","dq":"m4ETGRicKn6zttMX-6ZfkAsf5FwhmLDodgKi8SSrZ1EIcbLjcoHUKME4lhSNB6IugHs7YSRRiNA3S2Q7g6TsZJHp3sohpl9Li4RSv-uks2X0UAaRVUk63iVeM1eiuRVYeVq3sQPVdjFqsfk833s0Xf_Oj9nc11cxTWtzVq4zkOuGkP_JsZ6QcVCJ2zvn8HOtsNQPQ5eW3bXWWTUP6_LORbc_3f7-yYBYYY1G-HBi2mR0PlOaNypikgJQIn_VNTYOTwjQiCA7i1s1QKPMQHWpxRClVMfeVh-CGSV1FJF59L0QyYSY3ojiEz6Vqj5WXoUefZcRYyf7tE4jlqWiCp_2qw","qi":"n2s7uWRD1FBZuKseBe6hkE37uR-pc3yJgpZlabQwII2eXoYygZT_IHeRK-KgjK0EJ5XBfAEPcX9wvxGZJwH9AWVDihjJoj83B_STZ5YkGGxFWGmzrLs92GZzLBudTx3Y0Fs8baunMkoI_iDFS_UCPTf5gosQgpkiprvXhRV2pKOm28GpBpGkwqeyXSArQ0ogjJLfEx0lbv3BakGPeoVBh9u_spfcCH3d8mHTnT2dRiL_K0UkFef964egqV4xTTXJNGmkPPhijrmOnwD687qLqTNbKLuIvbkjM3kvQq4DpbV97pbxQ_WlH0TkP6AB2MsV-mzkfbG1_ryHhNLt7-2t6g"}';
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

  const handleFields = useCallback((attrs) => {
    setFields(attrs);
  }, []);

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

            {wallet && !arData && (
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
            <p>AR Link: {arData}</p>

            <div>Gib list with all addresses</div>
            <Form form={mintIdForm}>
              <Form.Item name="mintIds" rules={[jsonValidator(setRecipients)]}>
                <Input.TextArea
                  rows={4}
                  className={`${styles.card} ${styles["full-width"]}`}
                />
              </Form.Item>
              <Form.Item style={{ textAlign: "center" }}>
                <Button
                  type="primary"
                  shape="round"
                  size="large"
                  loading={loading}
                  onClick={mint}
                >
                  Sned it
                </Button>
              </Form.Item>
            </Form>
          </>
        )}
      </Card>
    </>
  );
}
