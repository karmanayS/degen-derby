// Supabase Edge Function: update-prices
// Called every 5 seconds during live races (via external cron or client trigger)
// Fetches current prices for all live races and inserts price snapshots
// Also transitions races from 'upcoming' to 'live' when start_time is reached

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEXSCREENER_BASE = "https://api.dexscreener.com";

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

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date().toISOString();

    // 1. Transition upcoming races to live if start_time has passed
    await supabase
      .from("races")
      .update({ status: "live" })
      .eq("status", "upcoming")
      .lte("start_time", now);

    // 2. Transition live races to finished if end_time has passed
    // (settle-race will handle payouts separately)
    const { data: expiredRaces } = await supabase
      .from("races")
      .select("id")
      .eq("status", "live")
      .lte("end_time", now);

    if (expiredRaces && expiredRaces.length > 0) {
      for (const race of expiredRaces) {
        // Call settle-race for each expired race
        try {
          await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/settle-race`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({ raceId: race.id }),
            }
          );
        } catch (err) {
          console.error(`Failed to settle race ${race.id}:`, err);
        }
      }
    }

    // 3. Fetch prices for all currently live races
    const { data: liveRaces } = await supabase
      .from("races")
      .select("*")
      .eq("status", "live");

    if (!liveRaces || liveRaces.length === 0) {
      return new Response(
        JSON.stringify({ message: "No live races" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Process each live race
    for (const race of liveRaces) {
      const coins = race.coins as any[];
      const prices = [];

      for (const coin of coins) {
        const currentPrice = await getTokenPrice(coin.address);
        const startPrice = coin.startPrice;
        const price = currentPrice ?? startPrice; // fallback to start price if API fails

        const percentChange =
          startPrice > 0 ? ((price - startPrice) / startPrice) * 100 : 0;

        prices.push({
          symbol: coin.symbol,
          address: coin.address,
          price,
          percentChange: Math.round(percentChange * 100) / 100,
        });
      }

      // Insert price snapshot — Supabase Realtime broadcasts this to all clients
      await supabase.from("race_prices").insert({
        race_id: race.id,
        prices,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        racesUpdated: liveRaces.length,
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