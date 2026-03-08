// Global race lifecycle manager
// - Creates 5 concurrent races when none exist
// - Transitions race statuses based on time (upcoming -> live -> finished)
// - When all 5 finish, creates 5 new ones
// - Polls prices in memory, writes to DB only on race finish

import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { getMultipleTokenPrices, getTrendingTokens } from "../lib/dexscreener";
import { BET_LIMITS, FALLBACK_COINS } from "../lib/constants";
import { CoinPrice } from "../types";

const LOBBY_DURATION_S = 60; // 1 minute to place bets
const RACE_DURATION_S = 300; // 5 minute race
const TICK_INTERVAL_MS = 3000; // check statuses every 3 seconds
const PRICE_POLL_MS = 1000; // poll prices every second
const NUM_RACES = 5; // number of concurrent races

// --- In-memory price store ---
const livePricesStore = new Map<string, CoinPrice[]>();
const priceListeners = new Map<string, Set<(prices: CoinPrice[]) => void>>();

function notifyListeners(raceId: string, prices: CoinPrice[]) {
  const listeners = priceListeners.get(raceId);
  if (listeners) {
    for (const cb of listeners) cb(prices);
  }
}

export function subscribeLivePrices(
  raceId: string,
  cb: (prices: CoinPrice[]) => void
): () => void {
  if (!priceListeners.has(raceId)) priceListeners.set(raceId, new Set());
  priceListeners.get(raceId)!.add(cb);

  // Immediately send current prices if available
  const current = livePricesStore.get(raceId);
  if (current) cb(current);

  return () => {
    priceListeners.get(raceId)?.delete(cb);
    if (priceListeners.get(raceId)?.size === 0) {
      priceListeners.delete(raceId);
    }
  };
}

// --- Race creation ---
function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function pickRaceSets(
  pool: { address: string; symbol: string; name: string; logo: string }[],
  numRaces: number
): { address: string; symbol: string; name: string; logo: string }[][] {
  const sets: { address: string; symbol: string; name: string; logo: string }[][] = [];

  for (let i = 0; i < numRaces; i++) {
    let attempts = 0;
    let selected = pickRandom(pool, 5);

    while (attempts < 10) {
      const addressKey = selected.map((c) => c.address).sort().join(",");
      const isDuplicate = sets.some(
        (s) => s.map((c) => c.address).sort().join(",") === addressKey
      );
      if (!isDuplicate) break;
      selected = pickRandom(pool, 5);
      attempts++;
    }

    sets.push(selected);
  }

  return sets;
}

let isCreating = false;

async function createRaces() {
  if (isCreating) return;
  isCreating = true;

  try {
    const coins = await getTrendingTokens();
    if (coins.length < 5) return;

    const raceSets = pickRaceSets(coins, NUM_RACES);

    const trendingAddresses = [...new Set(raceSets.flat().map((c) => c.address))];
    const fallbackAddresses = FALLBACK_COINS.map((f) => f.address);
    const allAddresses = [...new Set([...trendingAddresses, ...fallbackAddresses])];
    const allPrices = await getMultipleTokenPrices(allAddresses);

    const startTime = new Date(Date.now() + LOBBY_DURATION_S * 1000);
    const endTime = new Date(
      startTime.getTime() + RACE_DURATION_S * 1000
    );

    const raceRows = raceSets.map((selected) => {
      const raceCoins: {
        address: string;
        name: string;
        symbol: string;
        logo: string;
        startPrice: number;
        endPrice: null;
      }[] = [];

      const usedAddresses = new Set<string>();

      for (const c of selected) {
        const priceData = allPrices.find((p) => p.address === c.address);
        if (priceData && priceData.price > 0) {
          raceCoins.push({
            address: c.address,
            name: c.name,
            symbol: c.symbol,
            logo: c.logo,
            startPrice: priceData.price,
            endPrice: null,
          });
          usedAddresses.add(c.address);
        }
      }

      for (const fb of FALLBACK_COINS) {
        if (raceCoins.length >= 5) break;
        if (usedAddresses.has(fb.address)) continue;
        const fbPrice = allPrices.find((p) => p.address === fb.address);
        if (!fbPrice || fbPrice.price <= 0) continue;
        raceCoins.push({
          address: fb.address,
          name: fb.name,
          symbol: fb.symbol,
          logo: fbPrice.logo,
          startPrice: fbPrice.price,
          endPrice: null,
        });
        usedAddresses.add(fb.address);
      }

      return {
        coins: raceCoins,
        entry_fee: BET_LIMITS.MIN,
        race_duration: RACE_DURATION_S,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: "upcoming" as const,
        total_pot: 0,
        is_vip: false,
      };
    });

    const validRaces = raceRows.filter((r) => r.coins.length === 5);
    if (validRaces.length === 0) return;

    await supabase.from("races").insert(validRaces);
  } catch (err) {
    console.warn("Failed to create races:", err);
  } finally {
    isCreating = false;
  }
}

// --- Status transitions ---
async function transitionRaceStatuses() {
  const now = new Date().toISOString();

  // upcoming -> live
  await supabase
    .from("races")
    .update({ status: "live" })
    .eq("status", "upcoming")
    .lte("start_time", now);

  // live -> finished
  const { data: expiredRaces } = await supabase
    .from("races")
    .select("id")
    .eq("status", "live")
    .lte("end_time", now);

  if (expiredRaces && expiredRaces.length > 0) {
    for (const race of expiredRaces) {
      // Read final prices from in-memory store
      const finalPrices = livePricesStore.get(race.id);

      let winningCoin: string | null = null;
      if (finalPrices && finalPrices.length > 0) {
        const best = finalPrices.reduce((a, b) =>
          (a.percentChange ?? 0) > (b.percentChange ?? 0) ? a : b
        );
        winningCoin = best.symbol;

        // Write final snapshot to DB for results screen
        await supabase.from("race_prices").insert({
          race_id: race.id,
          prices: finalPrices,
        });
      }

      await supabase
        .from("races")
        .update({ status: "finished", winning_coin: winningCoin })
        .eq("id", race.id);

      // Clean up in-memory store
      livePricesStore.delete(race.id);
      priceListeners.delete(race.id);
    }
  }
}

async function createRacesIfNeeded() {
  const { data } = await supabase
    .from("races")
    .select("id, status")
    .in("status", ["upcoming", "live"])
    .limit(1);

  if (!data || data.length === 0) {
    await createRaces();
  }
}

// --- Price polling (in-memory only) ---
async function pollAllLiveRaces() {
  const { data: liveRaces } = await supabase
    .from("races")
    .select("id, coins")
    .eq("status", "live");

  if (!liveRaces || liveRaces.length === 0) return;

  const allAddresses = new Set<string>();
  for (const race of liveRaces) {
    for (const coin of race.coins as any[]) {
      allAddresses.add(coin.address);
    }
  }

  const prices = await getMultipleTokenPrices([...allAddresses]);
  if (prices.length === 0) return;

  for (const race of liveRaces) {
    const coins = race.coins as any[];
    const priceData: CoinPrice[] = coins.map((coin: any) => {
      const fetched = prices.find((p) => p.address === coin.address);
      const currentPrice = fetched?.price ?? coin.startPrice;
      const percentChange =
        coin.startPrice > 0
          ? ((currentPrice - coin.startPrice) / coin.startPrice) * 100
          : 0;
      return {
        symbol: coin.symbol,
        address: coin.address,
        price: currentPrice,
        percentChange: Math.round(percentChange * 100) / 100,
      };
    });

    // Update in-memory store and notify listeners
    livePricesStore.set(race.id, priceData);
    notifyListeners(race.id, priceData);
  }
}

// --- Main tick ---
async function tick() {
  await transitionRaceStatuses();
  await createRacesIfNeeded();
}

export function useRaceScheduler() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const priceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    tick();
    intervalRef.current = setInterval(tick, TICK_INTERVAL_MS);

    pollAllLiveRaces();
    priceIntervalRef.current = setInterval(pollAllLiveRaces, PRICE_POLL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (priceIntervalRef.current) clearInterval(priceIntervalRef.current);
    };
  }, []);
}