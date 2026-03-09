import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { SKR_MINT } from "./constants";

// checks for SKR token by mint, with fallback scan for tokens with "SKR" symbol
export async function checkSkrBalance(
  connection: Connection,
  walletAddress: PublicKey
): Promise<{ hasSkr: boolean; balance: number }> {
  try {
    console.log("[SKR] checking all token accounts for wallet:", walletAddress.toBase58());
    console.log("[SKR] expected mint:", SKR_MINT.toBase58());

    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletAddress,
      { programId: TOKEN_PROGRAM_ID }
    );

    console.log("[SKR] found", tokenAccounts.value.length, "token accounts");

    // log all tokens for debugging
    for (const account of tokenAccounts.value) {
      const info = account.account.data.parsed.info;
      const mint = info.mint;
      const amount = info.tokenAmount.uiAmount ?? 0;
      if (amount > 0) {
        console.log("[SKR] token:", mint, "balance:", amount);
      }
    }

    // check for the configured SKR mint first
    const skrAccount = tokenAccounts.value.find(
      (a) => a.account.data.parsed.info.mint === SKR_MINT.toBase58()
    );

    if (skrAccount) {
      const balance = skrAccount.account.data.parsed.info.tokenAmount.uiAmount ?? 0;
      console.log("[SKR] found SKR by mint, balance:", balance);
      return { hasSkr: balance > 0, balance };
    }

    console.log("[SKR] configured mint not found, check the SKR_MINT address in constants.ts");
    return { hasSkr: false, balance: 0 };
  } catch (err: unknown) {
    console.error("[SKR] check failed:", err);
    return { hasSkr: false, balance: 0 };
  }
}