// Supabase Edge Function: create-race
// Called by pg_cron every 6 minutes
// Checks if any upcoming/live races exist — if not, creates 5 new races

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEXSCREENER_BASE = "https://api.dexscreener.com";
const LOBBY_DURATION_S = 60;
const RACE_DURATION_S = 300;
const NUM_RACES = 5;
const ENTRY_FEE = 0.01;

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

async function getBatchPrices(addresses: string[]): Promise<TokenPrice[]> {
  const results: TokenPrice[] = [];
  // DexScreener supports comma-separated addresses (max 30)
  const chunks: string[][] = [];
  for (let i = 0; i < addresses.length; i += 30) {
    chunks.push(addresses.slice(i, i + 30));
  }

  for (const chunk of chunks) {
    try {
      const res = await fetch(
        `${DEXSCREENER_BASE}/latest/dex/tokens/${chunk.join(",")}`
      );
      const data = await res.json();
      if (!data.pairs || data.pairs.length === 0) continue;

      const solanaPairs = data.pairs.filter((p: any) => p.chainId === "solana");
      const bestByToken = new Map<string, any>();
      for (const pair of solanaPairs) {
        const addr = pair.baseToken.address;
        const existing = bestByToken.get(addr);
        if (!existing || (pair.liquidity?.usd ?? 0) > (existing.liquidity?.usd ?? 0)) {
          bestByToken.set(addr, pair);
        }
      }

      for (const [, pair] of bestByToken) {
        results.push({
          address: pair.baseToken.address,
          symbol: pair.baseToken.symbol,
          name: pair.baseToken.name,
          price: parseFloat(pair.priceUsd),
          logo: pair.info?.imageUrl ?? "",
        });
      }
    } catch {
      // skip chunk on error
    }
  }

  return results;
}

// Fetch actively traded pump.fun tokens with high volume
async function getActivePumpFunTokens(): Promise<TokenPrice[]> {
  try {
    const res = await fetch(`${DEXSCREENER_BASE}/token-boosts/latest/v1`);
    const data = await res.json();

    const seen = new Set<string>();
    const pumpAddresses: string[] = [];
    const otherAddresses: string[] = [];

    for (const t of data) {
      if (t.chainId !== "solana" || seen.has(t.tokenAddress)) continue;
      seen.add(t.tokenAddress);
      // Pump.fun tokens end in "pump" - these work with PumpPortal WS
      if (t.tokenAddress.endsWith("pump")) {
        pumpAddresses.push(t.tokenAddress);
      } else {
        otherAddresses.push(t.tokenAddress);
      }
    }

    // Prioritize pump.fun tokens, fill remaining slots with others
    const topAddresses = [
      ...pumpAddresses.slice(0, 25),
      ...otherAddresses.slice(0, 10),
    ].slice(0, 30);

    if (topAddresses.length === 0) return [];

    const prices = await getBatchPrices(topAddresses);

    const iconByAddress = new Map<string, string>();
    for (const t of data) {
      if (t.icon) iconByAddress.set(t.tokenAddress, t.icon);
    }

    return prices
      .filter((p) => p.price > 0)
      .map((p) => ({
        ...p,
        logo: p.logo || iconByAddress.get(p.address) || "",
      }));
  } catch {
    return [];
  }
}

async function getTrendingCoins(): Promise<TokenPrice[]> {
  // Try pump.fun focused fetch first
  const pumpCoins = await getActivePumpFunTokens();
  if (pumpCoins.length >= 5) return pumpCoins;

  // Fallback to generic trending
  try {
    const res = await fetch(`${DEXSCREENER_BASE}/token-boosts/latest/v1`);
    const data = await res.json();

    const seen = new Set<string>();
    const solanaTokens = data.filter((t: any) => {
      if (t.chainId !== "solana" || seen.has(t.tokenAddress)) return false;
      seen.add(t.tokenAddress);
      return true;
    });

    const topAddresses = solanaTokens.slice(0, 20).map((t: any) => t.tokenAddress);
    const prices = await getBatchPrices(topAddresses);

    const iconByAddress = new Map<string, string>();
    for (const t of solanaTokens.slice(0, 20)) {
      if (t.icon) iconByAddress.set(t.tokenAddress, t.icon);
    }

    return prices
      .filter((p) => p.price > 0)
      .map((p) => ({
        ...p,
        logo: p.logo || iconByAddress.get(p.address) || "",
      }));
  } catch {
    return [];
  }
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function pickRaceSets(pool: TokenPrice[], numRaces: number): TokenPrice[][] {
  const sets: TokenPrice[][] = [];
  for (let i = 0; i < numRaces; i++) {
    let attempts = 0;
    let selected = pickRandom(pool, 5);
    while (attempts < 10) {
      const key = selected.map((c) => c.address).sort().join(",");
      const isDuplicate = sets.some(
        (s) => s.map((c) => c.address).sort().join(",") === key
      );
      if (!isDuplicate) break;
      selected = pickRandom(pool, 5);
      attempts++;
    }
    sets.push(selected);
  }
  return sets;
}

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if any upcoming or live races already exist
    const { data: activeRaces } = await supabase
      .from("races")
      .select("id")
      .in("status", ["upcoming", "live"])
      .limit(1);

    if (activeRaces && activeRaces.length > 0) {
      return new Response(
        JSON.stringify({ message: "Active races already exist, skipping" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get trending coins
    let coins = await getTrendingCoins();

    // Pad with fallbacks if needed
    if (coins.length < 5) {
      const existingAddresses = new Set(coins.map((c) => c.address));
      const fallbackAddresses = FALLBACK_COINS
        .filter((f) => !existingAddresses.has(f.address))
        .map((f) => f.address);
      const fallbackPrices = await getBatchPrices(fallbackAddresses);
      for (const fp of fallbackPrices) {
        if (fp.price > 0 && !existingAddresses.has(fp.address)) {
          coins.push(fp);
          existingAddresses.add(fp.address);
        }
      }
    }

    if (coins.length < 5) {
      return new Response(
        JSON.stringify({ error: "Not enough coins available" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const raceSets = pickRaceSets(coins, NUM_RACES);

    const startTime = new Date(Date.now() + LOBBY_DURATION_S * 1000);
    const endTime = new Date(startTime.getTime() + RACE_DURATION_S * 1000);

    const raceRows = raceSets.map((selected) => {
      const raceCoins = selected.map((c) => ({
        address: c.address,
        name: c.name,
        symbol: c.symbol,
        logo: c.logo,
        startPrice: c.price,
        endPrice: null,
      }));

      return {
        coins: raceCoins,
        entry_fee: ENTRY_FEE,
        race_duration: RACE_DURATION_S,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: "upcoming" as const,
        total_pot: 0,
        is_vip: false,
      };
    });

    const validRaces = raceRows.filter((r) => r.coins.length === 5);
    if (validRaces.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid races could be created" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const { error } = await supabase.from("races").insert(validRaces);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, racesCreated: validRaces.length }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});