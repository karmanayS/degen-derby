// Supabase Edge Function: claim-payout
// Called by the client when a winner clicks "Claim" on the results screen
// Sends SOL from house wallet to the winner for a single bet

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "https://esm.sh/@solana/web3.js@1.95.3";
import bs58 from "https://esm.sh/bs58@5.0.0";

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { betId, walletAddress } = await req.json();
    if (!betId || !walletAddress) {
      return new Response(
        JSON.stringify({ error: "betId and walletAddress required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch the bet
    const { data: bet, error: betError } = await supabase
      .from("bets")
      .select("*")
      .eq("id", betId)
      .single();

    if (betError || !bet) {
      return new Response(
        JSON.stringify({ error: "Bet not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify wallet ownership
    if (bet.wallet_address !== walletAddress) {
      return new Response(
        JSON.stringify({ error: "Wallet mismatch" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check payout exists and hasn't been claimed
    if (!bet.payout || bet.payout <= 0) {
      return new Response(
        JSON.stringify({ error: "No payout for this bet" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (bet.claimed) {
      return new Response(
        JSON.stringify({ error: "Already claimed" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Send SOL
    const housePrivateKey = Deno.env.get("HOUSE_WALLET_PRIVATE_KEY");
    const rpcUrl = Deno.env.get("SOLANA_RPC_URL") ?? "https://api.devnet.solana.com";

    if (!housePrivateKey) {
      return new Response(
        JSON.stringify({ error: "House wallet not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const connection = new Connection(rpcUrl, "confirmed");
    const houseKeypair = Keypair.fromSecretKey(bs58.decode(housePrivateKey));

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: houseKeypair.publicKey,
        toPubkey: new PublicKey(walletAddress),
        lamports: Math.round(Number(bet.payout) * LAMPORTS_PER_SOL),
      })
    );

    const signature = await sendAndConfirmTransaction(connection, tx, [houseKeypair]);

    // Mark as claimed
    await supabase
      .from("bets")
      .update({ claimed: true })
      .eq("id", betId);

    return new Response(
      JSON.stringify({ success: true, signature, payout: bet.payout }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});