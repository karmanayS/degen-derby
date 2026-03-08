// Supabase Edge Function: settle-race
// Called when a race's end_time is reached
// Determines winner, calculates payouts, sends SOL to winners, updates all tables

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

const DEXSCREENER_BASE = "https://api.dexscreener.com";
const HOUSE_CUT_PERCENT = 5;

async function getTokenPrice(address: string): Promise<number | null> {
  try {
    const res = await fetch(`${DEXSCREENER_BASE}/latest/dex/tokens/${address}`);
    const data = await res.json();
    if (!data.pairs || data.pairs.length === 0) return null;

    const solanaPairs = data.pairs.filter((p: any) => p.chainId === "solana");
    if (solanaPairs.length === 0) return null;

    const best = solanaPairs.sort(
      (a: any, b: any) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0)
    )[0];

    return parseFloat(best.priceUsd);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { raceId } = await req.json();
    if (!raceId) {
      return new Response(
        JSON.stringify({ error: "raceId required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch the race
    const { data: race, error: raceError } = await supabase
      .from("races")
      .select("*")
      .eq("id", raceId)
      .single();

    if (raceError || !race) {
      return new Response(
        JSON.stringify({ error: "Race not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (race.status === "finished") {
      return new Response(
        JSON.stringify({ message: "Race already settled" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch final prices
    const coins = race.coins as any[];
    const updatedCoins = [];
    let maxChange = -Infinity;
    let winnerSymbol = "";

    for (const coin of coins) {
      const endPrice = await getTokenPrice(coin.address);
      const finalPrice = endPrice ?? coin.startPrice;
      const percentChange =
        coin.startPrice > 0
          ? ((finalPrice - coin.startPrice) / coin.startPrice) * 100
          : 0;

      updatedCoins.push({
        ...coin,
        endPrice: finalPrice,
      });

      if (percentChange > maxChange) {
        maxChange = percentChange;
        winnerSymbol = coin.symbol;
      }
    }

    // 2. Get all bets for this race
    const { data: bets } = await supabase
      .from("bets")
      .select("*")
      .eq("race_id", raceId);

    const allBets = bets ?? [];

    // 3. Calculate payouts (parimutuel)
    const totalPool = allBets.reduce((sum: number, b: any) => sum + b.amount, 0);
    const houseCut = totalPool * (HOUSE_CUT_PERCENT / 100);
    const winnerPool = totalPool - houseCut;

    const winningBets = allBets.filter((b: any) => b.picked_coin === winnerSymbol);
    const totalWinningBets = winningBets.reduce(
      (sum: number, b: any) => sum + b.amount,
      0
    );

    // 4. Send SOL payouts to winners
    const payouts: { walletAddress: string; payout: number; betId: string }[] = [];

    if (winningBets.length > 0 && totalWinningBets > 0) {
      const housePrivateKey = Deno.env.get("HOUSE_WALLET_PRIVATE_KEY");
      const rpcUrl = Deno.env.get("SOLANA_RPC_URL") ?? "https://api.devnet.solana.com";

      if (housePrivateKey) {
        const connection = new Connection(rpcUrl, "confirmed");
        const houseKeypair = Keypair.fromSecretKey(bs58.decode(housePrivateKey));

        for (const bet of winningBets) {
          const payout = (bet.amount / totalWinningBets) * winnerPool;
          payouts.push({
            walletAddress: bet.wallet_address,
            payout,
            betId: bet.id,
          });

          // Send SOL payout
          try {
            const tx = new Transaction().add(
              SystemProgram.transfer({
                fromPubkey: houseKeypair.publicKey,
                toPubkey: new PublicKey(bet.wallet_address),
                lamports: Math.round(payout * LAMPORTS_PER_SOL),
              })
            );

            await sendAndConfirmTransaction(connection, tx, [houseKeypair]);
          } catch (err) {
            console.error(`Payout failed for ${bet.wallet_address}:`, err);
            // Record the payout amount even if transfer fails
            // Can be retried manually
          }
        }
      }
    }

    // 5. Update race as finished
    await supabase
      .from("races")
      .update({
        status: "finished",
        winning_coin: winnerSymbol,
        coins: updatedCoins,
      })
      .eq("id", raceId);

    // 6. Update bet payouts
    for (const p of payouts) {
      await supabase
        .from("bets")
        .update({ payout: p.payout })
        .eq("id", p.betId);
    }

    // 7. Update leaderboard for all participants
    for (const bet of allBets) {
      const won = bet.picked_coin === winnerSymbol;
      const earned = won
        ? payouts.find((p) => p.betId === bet.id)?.payout ?? 0
        : 0;

      await supabase.rpc("update_leaderboard", {
        p_wallet: bet.wallet_address,
        p_won: won,
        p_earned: earned,
      });
    }

    // 8. Insert final price snapshot
    const finalPrices = updatedCoins.map((coin: any) => ({
      symbol: coin.symbol,
      address: coin.address,
      price: coin.endPrice,
      percentChange:
        coin.startPrice > 0
          ? Math.round(
              ((coin.endPrice - coin.startPrice) / coin.startPrice) * 10000
            ) / 100
          : 0,
    }));

    await supabase.from("race_prices").insert({
      race_id: raceId,
      prices: finalPrices,
    });

    return new Response(
      JSON.stringify({
        success: true,
        winner: winnerSymbol,
        totalPool,
        payoutsCount: payouts.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});