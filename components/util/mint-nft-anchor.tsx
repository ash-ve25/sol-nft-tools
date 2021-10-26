import React, { Dispatch, SetStateAction } from 'react';
import { MintLayout, Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import {
  Keypair,
  Connection,
  SystemProgram,
  TransactionInstruction,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import crypto from 'crypto';
import BN from 'bn.js';
import { Attribute, createMasterEdition, createMetadata, Creator, Data, updateMetadata } from '../../actions/metadata';
import { StringPublicKey, toPublicKey } from '../../utils/ids';
import { programIds } from '../../utils/programIds';
import { findProgramAddress, notify } from '../../utils';
import { createAssociatedTokenAccountInstruction, createMint } from '../../actions/account';
import { sendTransactionWithRetry } from '../../contexts/connection';
import { WalletSigner } from '../../contexts/wallet';
import { Wallet } from '@project-serum/anchor';

const RESERVED_TXN_MANIFEST = 'manifest.json';
const RESERVED_METADATA = 'metadata.json';
export const AR_SOL_HOLDER_ID = new PublicKey(
  'HvwC9QSAzvGXhhVrgPmauVwFWcYZhne3hVot9EbHuFTm',
);
interface IArweaveResult {
  error?: string;
  messages?: Array<{
    filename: string;
    status: 'success' | 'fail';
    transactionId?: string;
    error?: string;
  }>;
}

const uploadToArweave = async (data: FormData): Promise<IArweaveResult> => {
  const resp = await fetch(
    'https://us-central1-principal-lane-200702.cloudfunctions.net/uploadFile4',
    {
      method: 'POST',
      // @ts-ignore
      body: data,
    },
  );

  if (!resp.ok) {
    return Promise.reject(
      new Error(
        'Unable to upload the artwork to Arweave. Please wait and then try again.',
      ),
    );
  }

  const result: IArweaveResult = await resp.json();

  if (result.error) {
    return Promise.reject(new Error(result.error));
  }

  return result;
};

export const mintNFT = async (
  connection: Connection,
  wallet: Wallet | undefined,
  env: string,
  files: File[],
  metadata: {
    name: string;
    symbol: string;
    description: string;
    image: string | undefined;
    animation_url: string | undefined;
    attributes: Attribute[] | undefined;
    external_url: string;
    properties: any;
    creators: Creator[] | null;
    sellerFeeBasisPoints: number;
  },
  progressCallback: Dispatch<SetStateAction<number>>,
  maxSupply?: number,
): Promise<{
  metadataAccount: StringPublicKey;
  mintKey: StringPublicKey;
} | void> => {
  if (!wallet?.publicKey) return;

  const metadataContent = {
    name: metadata.name,
    symbol: metadata.symbol,
    description: metadata.description,
    seller_fee_basis_points: metadata.sellerFeeBasisPoints,
    image: metadata.image,
    animation_url: metadata.animation_url,
    attributes: metadata.attributes,
    external_url: metadata.external_url,
    properties: {
      ...metadata.properties,
      creators: metadata.creators?.map(creator => {
        return {
          address: creator.address,
          share: creator.share,
        };
      }),
    },
  };

  const realFiles: File[] = [
    ...files,
    new File([JSON.stringify(metadataContent)], RESERVED_METADATA),
  ];

  const { instructions: pushInstructions, signers: pushSigners } =
    await prepPayForFilesTxn(wallet, realFiles, metadata);

  progressCallback(1)

  const TOKEN_PROGRAM_ID = programIds().token;

  // Allocate memory for the account
  const mintRent = await connection.getMinimumBalanceForRentExemption(
    MintLayout.span,
  );
  const payerPublicKey = wallet.publicKey.toBase58();
  const instructions: TransactionInstruction[] = [...pushInstructions];
  const signers: Keypair[] = [...pushSigners];

  // This is only temporarily owned by wallet...transferred to program by createMasterEdition below
  const mintKey = createMint(
    instructions,
    wallet.publicKey,
    mintRent,
    0,
    // Some weird bug with phantom where it's public key doesnt mesh with data encode wellff
    toPublicKey(payerPublicKey),
    toPublicKey(payerPublicKey),
    signers,
  ).toBase58();

  const recipientKey = (
    await findProgramAddress(
      [
        wallet.publicKey.toBuffer(),
        programIds().token.toBuffer(),
        toPublicKey(mintKey).toBuffer(),
      ],
      programIds().associatedToken,
    )
  )[0];

  createAssociatedTokenAccountInstruction(
    instructions,
    toPublicKey(recipientKey),
    wallet.publicKey,
    wallet.publicKey,
    toPublicKey(mintKey),
  );

  const metadataAccount = await createMetadata(
    new Data({
      symbol: metadata.symbol,
      name: metadata.name,
      uri: ' '.repeat(64), // size of url for arweave
      sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
      creators: metadata.creators,
    }),
    payerPublicKey,
    mintKey,
    payerPublicKey,
    instructions,
    wallet.publicKey.toBase58(),
  );
  progressCallback(2)

  const { txid } = await sendTransactionWithRetry(
    connection,
    wallet,
    instructions,
    signers,
    'single',
  );
  progressCallback(3)

  try {
    await connection.confirmTransaction(txid, 'max');
    progressCallback(4)
  } catch {
    // ignore
  }
  await connection.getParsedConfirmedTransaction(txid, 'confirmed');

  progressCallback(5)

  const data = new FormData();
  data.append('transaction', txid);
  data.append('env', env);

  const tags = realFiles.reduce(
    (acc: Record<string, Array<{ name: string; value: string }>>, f) => {
      acc[f.name] = [{ name: 'mint', value: mintKey }];
      return acc;
    },
    {},
  );
  data.append('tags', JSON.stringify(tags));
  realFiles.map(f => data.append('file[]', f));

  const result: IArweaveResult = await uploadToArweave(data);
  progressCallback(6)

  const metadataFile = result.messages?.find(
    m => m.filename === RESERVED_TXN_MANIFEST,
  );
  if (metadataFile?.transactionId && wallet.publicKey) {
    const updateInstructions: TransactionInstruction[] = [];
    const updateSigners: Keypair[] = [];

    const arweaveLink = `https://arweave.net/${metadataFile.transactionId}`;
    await updateMetadata(
      new Data({
        name: metadata.name,
        symbol: metadata.symbol,
        uri: arweaveLink,
        creators: metadata.creators,
        sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
      }),
      undefined,
      undefined,
      mintKey,
      payerPublicKey,
      updateInstructions,
      metadataAccount,
    );

    updateInstructions.push(
      Token.createMintToInstruction(
        TOKEN_PROGRAM_ID,
        toPublicKey(mintKey),
        toPublicKey(recipientKey),
        toPublicKey(payerPublicKey),
        [],
        1,
      ),
    );

    progressCallback(7)
    await createMasterEdition(
      maxSupply !== undefined ? new BN(maxSupply) : undefined,
      mintKey,
      payerPublicKey,
      payerPublicKey,
      payerPublicKey,
      updateInstructions,
    );


    progressCallback(8)

    const txid = await sendTransactionWithRetry(
      connection,
      wallet,
      updateInstructions,
      updateSigners,
    );

    notify({
      message: 'Art created on Solana',
      description: (
        <a href={arweaveLink} target="_blank" rel="noopener noreferrer">
          Arweave Link
        </a>
      ),
      type: 'success',
    });

    // TODO: refund funds

    // send transfer back to user
  }
  // TODO:
  // 1. Jordan: --- upload file and metadata to storage API
  // 2. pay for storage by hashing files and attaching memo for each file

  const transaction = new web3.Transaction().add(
    Token.createTransferInstruction(
      TOKEN_PROGRAM_ID,
      fromTokenAccount.address,
      toTokenAccount.address,
      wallet,
      [],
      1
    )
  );


  return { metadataAccount, mintKey };


};

export const prepPayForFilesTxn = async (
  wallet: WalletSigner,
  files: File[],
  metadata: any,
): Promise<{
  instructions: TransactionInstruction[];
  signers: Keypair[];
}> => {
  const memo = programIds().memo;

  const instructions: TransactionInstruction[] = [];
  const signers: Keypair[] = [];

  if (wallet.publicKey)
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: AR_SOL_HOLDER_ID,
        lamports: 2300 // 0.0023 SOL per file (paid to arweave)
          // await getAssetCostToStore(files),
      }),
    );

  for (let i = 0; i < files.length; i++) {
    const hashSum = crypto.createHash('sha256');
    hashSum.update(await files[i].text());
    const hex = hashSum.digest('hex');
    instructions.push(
      new TransactionInstruction({
        keys: [],
        programId: memo,
        data: Buffer.from(hex),
      }),
    );
  }

  return {
    instructions,
    signers,
  };
};

export const sendNft = async ({
  connection,
  mintKey,
  wallet,
}: {
  connection: Connection;
  mintKey: string | PublicKey;
  wallet: Wallet;
}) => {

  const tx = new Transaction()
  const myToken = new Token(
    connection,
    toPublicKey(mintKey),
    TOKEN_PROGRAM_ID,
    undefined
  );

  const fromTokenAccount = await myToken.getOrCreateAssociatedAccountInfo(
    wallet.publicKey
  );
  const toTokenAccount = await myToken.getOrCreateAssociatedAccountInfo(
    toPublicKey("GoV8U9c4hjCjeosW1VKsDuRTfUe96sUPAC5RyUbstpUt")
  );

  tx.add(
    Token.createTransferInstruction(
      TOKEN_PROGRAM_ID,
      fromTokenAccount.address,
      toTokenAccount.address,
      wallet.publicKey,
      [],
      1
    )
  );

  wallet.signTransaction(tx);
  const txId = await connection.sendTransaction(tx, [wallet.payer]);
  return txId;
};

