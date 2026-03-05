import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { HOUSE_WALLET } from "./constants";

export function createEntryFeeTransaction(
  payerPubkey: PublicKey,
  entryFeeSol: number
): Transaction {
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payerPubkey,
      toPubkey: HOUSE_WALLET,
      lamports: Math.round(entryFeeSol * LAMPORTS_PER_SOL),
    })
  );
  return transaction;
}

export async function getLatestBlockhash(connection: Connection) {
  return await connection.getLatestBlockhash("confirmed");
}

export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

export function solToLamports(sol: number): number {
  return Math.round(sol * LAMPORTS_PER_SOL);
}