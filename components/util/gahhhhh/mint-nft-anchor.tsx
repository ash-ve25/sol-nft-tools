import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
  SYSVAR_RENT_PUBKEY
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  MintLayout,
  Token,
} from "@solana/spl-token";
import BN from "bn.js";
import { CreateMetadataArgs, Creator, Data } from "../../actions";
import { serialize } from "borsh";
import { CreateMasterEditionArgs, METADATA_SCHEMA } from "./schema";

import {
} from "@solana/web3.js";

const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

export function createMetadataInstruction(
  metadataAccount: PublicKey,
  mint: PublicKey,
  mintAuthority: PublicKey,
  payer: PublicKey,
  updateAuthority: PublicKey,
  data: Buffer
): TransactionInstruction {
  const keys = [
    {
      pubkey: metadataAccount,
      isSigner: false,
      isWritable: true
    },
    {
      pubkey: mint,
      isSigner: false,
      isWritable: false
    },
    {
      pubkey: mintAuthority,
      isSigner: true,
      isWritable: false
    },
    {
      pubkey: payer,
      isSigner: true,
      isWritable: false
    },
    {
      pubkey: updateAuthority,
      isSigner: false,
      isWritable: false
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false
    }
  ];
  const tx = new TransactionInstruction({
    keys,
    programId: TOKEN_METADATA_PROGRAM_ID,
    data: data
  });
  return tx;
}

export function createMasterEditionInstruction(
  metadataAccount: PublicKey,
  editionAccount: PublicKey,
  mint: PublicKey,
  mintAuthority: PublicKey,
  payer: PublicKey,
  updateAuthority: PublicKey,
  data: Buffer
) {
  const keys = [
    {
      pubkey: editionAccount,
      isSigner: false,
      isWritable: true
    },
    {
      pubkey: mint,
      isSigner: false,
      isWritable: true
    },
    {
      pubkey: updateAuthority,
      isSigner: true,
      isWritable: false
    },
    {
      pubkey: mintAuthority,
      isSigner: true,
      isWritable: false
    },
    {
      pubkey: payer,
      isSigner: true,
      isWritable: false
    },
    {
      pubkey: metadataAccount,
      isSigner: false,
      isWritable: false
    },
    {
      pubkey: TOKEN_PROGRAM_ID,
      isSigner: false,
      isWritable: false
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false
    }
  ];
  const tx = new TransactionInstruction({
    keys,
    programId: TOKEN_METADATA_PROGRAM_ID,
    data: data
  });
  return tx;
}

const METAPLEX_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

async function main() {
  let connection: Connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );

  let creator = new Keypair();

  await connection.requestAirdrop(creator.publicKey, 1 * LAMPORTS_PER_SOL);

  let user = new PublicKey("AVdBTNhDqYgXGaaVkqiaUJ1Yqa61hMiFFaVRtqwzs5GZ");

  const creators = [
    new Creator({
      address: creator.publicKey.toString(),
      share: 100,
      verified: true
    })
  ];

  const data = new Data({
    symbol: "SYMBOL",
    name: "My NFT",
    uri: "https://arweave.net/FPGAv1XnyZidnqquOdEbSY6_ES735ckcDTdaAtI7GFw",
    sellerFeeBasisPoints: 100,
    creators
  });

  mintNFT(connection, creator, user, data);
}

export async function mintNFT(
  connection: Connection,
  creator: Keypair,
  user: PublicKey,
  data: Data
): Promise<string> {
  const mint = new Keypair();

  // Allocate memory for the account
  const mintRent = await connection.getMinimumBalanceForRentExemption(
    MintLayout.span
  );

  // Create mint account
  const createMintAccountIx = SystemProgram.createAccount({
    fromPubkey: creator.publicKey,
    newAccountPubkey: mint.publicKey,
    lamports: mintRent,
    space: MintLayout.span,
    programId: TOKEN_PROGRAM_ID
  });

  // Initalize mint ix
  // Creator keypair is mint and freeze authority
  const initMintIx = Token.createInitMintInstruction(
    TOKEN_PROGRAM_ID,
    mint.publicKey,
    0,
    creator.publicKey,
    null
  );

  // Derive associated token account for user
  const assoc = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mint.publicKey,
    user
  );

  // Create associated account for user
  const createAssocTokenAccountIx =
    Token.createAssociatedTokenAccountInstruction(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mint.publicKey,
      assoc,
      user,
      creator.publicKey
    );

  // Create mintTo ix; mint to user's associated account
  const mintToIx = Token.createMintToInstruction(
    TOKEN_PROGRAM_ID,
    mint.publicKey,
    assoc,
    creator.publicKey, // Mint authority
    [], // No multi-sign signers
    1
  );

  // Derive metadata account
  const metadataSeeds = [
    Buffer.from("metadata"),
    METAPLEX_PROGRAM_ID.toBuffer(),
    mint.publicKey.toBuffer()
  ];
  const [metadataAccount, _pda] = await PublicKey.findProgramAddress(
    metadataSeeds,
    METAPLEX_PROGRAM_ID
  );

  // Derive Master Edition account
  const masterEditionSeeds = [
    Buffer.from("metadata"),
    METAPLEX_PROGRAM_ID.toBuffer(),
    mint.publicKey.toBuffer(),
    Buffer.from("edition")
  ];
  const [masterEditionAccount, _] = await PublicKey.findProgramAddress(
    masterEditionSeeds,
    METAPLEX_PROGRAM_ID
  );

  console.log(METADATA_SCHEMA)
  debugger
  let buffer = Buffer.from(
    serialize(
      METADATA_SCHEMA,
      new CreateMetadataArgs({ data, isMutable: true })
    )
  );

  // Create metadata account ix
  const createMetadataIx = createMetadataInstruction(
    metadataAccount,
    mint.publicKey,
    creator.publicKey,
    creator.publicKey,
    creator.publicKey,
    buffer
  );

  buffer = Buffer.from(
    serialize(
      METADATA_SCHEMA,
      new CreateMasterEditionArgs({ maxSupply: new BN(0) })
    )
  );

  const createMasterEditionIx = createMasterEditionInstruction(
    metadataAccount,
    masterEditionAccount,
    mint.publicKey,
    creator.publicKey,
    creator.publicKey,
    creator.publicKey,
    buffer
  );

  let tx = new Transaction()
    .add(createMintAccountIx)
    .add(initMintIx)
    .add(createAssocTokenAccountIx)
    .add(mintToIx)
    .add(createMetadataIx)
    .add(createMasterEditionIx);

  const recent = await connection.getRecentBlockhash();
  tx.recentBlockhash = recent.blockhash;
  tx.feePayer = creator.publicKey;

  tx.sign(mint, creator);

  const txSignature = await connection.sendRawTransaction(tx.serialize());

  console.log(txSignature);
  return txSignature;
}
