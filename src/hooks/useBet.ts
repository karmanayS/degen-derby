import { useState } from "react";
import { useConnection } from "../utils/ConnectionProvider";
import { useAuthorization } from "../utils/useAuthorization";
import { useMobileWallet } from "../utils/useMobileWallet";
import { createEntryFeeTransaction, getLatestBlockhash } from "../lib/solana";
import { supabase } from "../lib/supabase";

export function useBet() {
  const { connection } = useConnection();
  const { selectedAccount } = useAuthorization();
  const { signAndSendTransaction } = useMobileWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const placeBet = async (
    raceId: string,
    pickedCoin: string,
    entryFee: number
  ): Promise<boolean> => {
    if (!selectedAccount) {
      setError("Wallet not connected");
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const transaction = createEntryFeeTransaction(
        selectedAccount.publicKey,
        entryFee
      );

      const { blockhash, lastValidBlockHeight } =
        await getLatestBlockhash(connection);
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = selectedAccount.publicKey;

      const txSignature = await signAndSendTransaction(
        transaction,
        lastValidBlockHeight
      );

      const { error: dbError } = await supabase.from("bets").insert({
        race_id: raceId,
        wallet_address: selectedAccount.publicKey.toBase58(),
        picked_coin: pickedCoin,
        amount: entryFee,
        tx_signature: txSignature,
      });

      if (dbError) {
        setError("Bet recorded on-chain but failed to save. Contact support.");
        setLoading(false);
        return false;
      }

      await supabase.rpc("increment_pot", {
        race_id: raceId,
        amount: entryFee,
      });

      setLoading(false);
      return true;
    } catch (err: any) {
      setError(err?.message ?? "Transaction failed");
      setLoading(false);
      return false;
    }
  };

  return { placeBet, loading, error };
}