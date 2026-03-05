import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { SKR_MINT } from "./constants";

export async function checkSkrBalance(
  connection: Connection,
  walletAddress: PublicKey
): Promise<{ hasSkr: boolean; balance: number }> {
  try {
    const ata = getAssociatedTokenAddressSync(SKR_MINT, walletAddress);
    const accountInfo = await connection.getTokenAccountBalance(ata);
    const balance = accountInfo.value.uiAmount ?? 0;
    return { hasSkr: balance > 0, balance };
  } catch {
    // Token account doesn't exist = no SKR
    return { hasSkr: false, balance: 0 };
  }
}