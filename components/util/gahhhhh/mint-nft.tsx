import { web3 } from "@project-serum/anchor";
import { Token } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { findProgramAddress, programIds } from "../../utils";
import { TOKEN_PROGRAM_ID, toPublicKey } from "../../utils/ids";

export const mintAndSend = async ({ connection, publicKey, wallet }) => {
  // const mintAccount = web3.Keypair.generate();
  const mint = await Token.createMint(
    connection,
    wallet.payer,
    wallet.publicKey,
    null,
    0,
    TOKEN_PROGRAM_ID
  );

  const fromTokenAccount = await mint.getOrCreateAssociatedAccountInfo(
    wallet.publicKey
  );

  debugger

  const toTokenAccount = await mint.getOrCreateAssociatedAccountInfo(
    new PublicKey(publicKey)
  );
  debugger

  await mint.mintTo(toTokenAccount.address, wallet.publicKey, [], 1);

  // const recipientKey = (
  //   await findProgramAddress(
  //     [
  //       wallet.publicKey.toBuffer(),
  //       programIds().token.toBuffer(),
  //       toPublicKey(mint.).toBuffer(),
  //     ],
  //     programIds().associatedToken,
  //   )
  // )[0];

  // const transaction = new web3.Transaction().add(
  //   Token.createTransferInstruction(
  //     TOKEN_PROGRAM_ID,
  //     fromTokenAccount.address,
  //     toTokenAccount.address,
  //     wallet,
  //     [],
  //     1
  //   )
  // );

  // const { blockhash } = await connection.getRecentBlockhash('confirmed');
  const txId = await mint.transfer(
    fromTokenAccount.address,
    toTokenAccount.address,
    wallet,
    [],
    1
  )

  debugger
  // debugger
  // transaction.recentBlockhash = blockhash;
  // await wallet.signTransaction(transaction);
  // // const txId = await connection.sendAndConfirmTransaction(transaction);
  // debugger;
  // const txId = await wallet.confirmTransaction(transaction);
  // debugger;
  return txId;
};
