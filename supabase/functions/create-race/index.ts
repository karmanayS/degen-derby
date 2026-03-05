// Supabase Edge Function: create-race
// Triggered via cron (every 15 min) or manually via HTTP POST
// Picks 5 trending memecoins, records start prices, creates a new race

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEXSCREENER_BASE = "https://api.dexscreener.com";

const FALLBACK_COINS = [
  { address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", symbol: "BONK", name: "Bonk" },
  { address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", symbol: "WIF", name: "dogwifhat" },
  { address: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr", symbol: "POPCAT", name: "Popcat" },
  { address: "ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82", symbol: "BOME", name: "Book of Meme" },
  { address: "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5", symbol: "MEW", name: "cat in a dogs world" },
  { address: "A8C3xuqscfmyLrQ3HwSSXP813pUwB3NETnRBJiKYampw", symbol: "SLERF", name: "SLERF" },
  { address: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", symbol: "JUP", name: "Jupiter" },
  { address: "7atgF8KQo4wJrD5ATGX7t1V2zVvykPJbFfNeVf1icFv1", symbol: "CSOL", name: "Solana (Coinbase)" },
];

interface TokenPrice {
  address: string;
  symbol: string;
  name: string;
  price: number;
  logo: string;
}

async function getTokenPrice(address: string): Promise<TokenPrice | null> {
  try {
    const res = await fetch(`${DEXSCREENER_BASE}/latest/dex/tokens/${address}`);
    const data = await res.json();
    if (!data.pairs || data.pairs.length === 0) return null;

    const solanaPairs = data.pairs.filter((p: any) => p.chainId === "solana");
    if (solanaPairs.length === 0) return null;

    const best = solanaPairs.sort(
      (a: any, b: any) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0)
    )[0];

    return {
      address: best.baseToken.address,
      symbol: best.baseToken.symbol,
      name: best.baseToken.name,
      price: parseFloat(best.priceUsd),
      logo: best.info?.imageUrl ?? "",
    };
  } catch {
    return null;
  }
}

async function getTrendingCoins(): Promise<TokenPrice[]> {
  try {
    const res = await fetch(`${DEXSCREENER_BASE}/token-boosts/latest/v1`);
    const data = await res.json();

    const seen = new Set<string>();
    const solanaTokens = data.filter((t: any) => {
      if (t.chainId !== "solana" || seen.has(t.tokenAddress)) return false;
      seen.add(t.tokenAddress);
      return true;
    });

    const top = solanaTokens.slice(0, 15);
    const results: TokenPrice[] = [];

    for (const t of top) {
      const price = await getTokenPrice(t.tokenAddress);
      if (price && price.price > 0) {
        results.push(price);
      }
      if (results.length >= 8) break;
    }

    return results;
  } catch {
    return [];
  }
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Parse optional params from request body
    let raceDuration = 300; // default 5 minutes
    let entryFee = 0.05;
    let isVip = false;

    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body.duration) raceDuration = body.duration;
        if (body.entryFee) entryFee = body.entryFee;
        if (body.isVip) isVip = body.isVip;
      } catch {
        // No body or invalid JSON — use defaults
      }
    }

    // Get trending coins
    let coins = await getTrendingCoins();

    // Fallback to curated list if trending returns too few
    if (coins.length < 5) {
      const fallbackPrices: TokenPrice[] = [];
      for (const fc of FALLBACK_COINS) {
        const price = await getTokenPrice(fc.address);
        if (price) fallbackPrices.push(price);
        if (fallbackPrices.length + coins.length >= 8) break;
      }
      // Merge, deduplicating by address
      const existingAddresses = new Set(coins.map((c) => c.address));
      for (const fp of fallbackPrices) {
        if (!existingAddresses.has(fp.address)) {
          coins.push(fp);
        }
      }
    }

    if (coins.length < 5) {
      return new Response(
        JSON.stringify({ error: "Not enough coins available" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Pick 5 random coins
    const selectedCoins = pickRandom(coins, 5);

    // Build coins JSONB for the race
    const raceCoins = selectedCoins.map((c) => ({
      address: c.address,
      name: c.name,
      symbol: c.symbol,
      logo: c.logo,
      startPrice: c.price,
      endPrice: null,
    }));

    // Set start time to 2 minutes from now (lobby time)
    const startTime = new Date(Date.now() + 2 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + raceDuration * 1000);

    // Insert the race
    const { data, error } = await supabase.from("races").insert({
      coins: raceCoins,
      entry_fee: entryFee,
      race_duration: raceDuration,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: "upcoming",
      total_pot: 0,
      is_vip: isVip,
    }).select().single();

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, race: data }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});