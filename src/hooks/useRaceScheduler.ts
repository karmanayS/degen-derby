// Global race lifecycle manager
// - Creates 5 concurrent races when none exist
// - Transitions race statuses based on time (upcoming -> live -> finished)
// - When all 5 finish, creates 5 new ones
// - Runs independently of which screen the user is on

import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { getMultipleTokenPrices, getTrendingTokens } from "../lib/dexscreener";
import { PRICE_POLL_INTERVAL } from "../lib/constants";

const LOBBY_DURATION_S = 60; // 1 minute to place bets
const RACE_DURATION_S = 300; // 5 minute race
const TICK_INTERVAL_MS = 3000; // check statuses every 3 seconds
const NUM_RACES = 5; // number of concurrent races

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// Pick 5 unique sets of 5 tokens from a pool, ensuring no two sets are identical
function pickRaceSets(
  pool: { address: string; symbol: string; name: string; logo: string }[],
  numRaces: number
): { address: string; symbol: string; name: string; logo: string }[][] {
  const sets: { address: string; symbol: string; name: string; logo: string }[][] = [];

  for (let i = 0; i < numRaces; i++) {
    let attempts = 0;
    let selected = pickRandom(pool, 5);

    // Ensure this set isn't identical to any previous set
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
    // Need at least 5 coins to make races, ideally more for variety
    if (coins.length < 5) return;

    const raceSets = pickRaceSets(coins, NUM_RACES);

    // Fetch prices for all unique coins across all races
    const allAddresses = [...new Set(raceSets.flat().map((c) => c.address))];
    const prices = await getMultipleTokenPrices(allAddresses);

    const startTime = new Date(Date.now() + LOBBY_DURATION_S * 1000);
    const endTime = new Date(
      startTime.getTime() + RACE_DURATION_S * 1000
    );

    const raceRows = raceSets.map((selected) => {
      const raceCoins = selected.map((c) => {
        const priceData = prices.find((p) => p.address === c.address);
        return {
          address: c.address,
          name: c.name,
          symbol: c.symbol,
          logo: c.logo,
          startPrice: priceData?.price ?? 0,
          endPrice: null,
        };
      });

      return {
        coins: raceCoins,
        entry_fee: 0.05,
        race_duration: RACE_DURATION_S,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: "upcoming" as const,
        total_pot: 0,
        is_vip: false,
      };
    });

    await supabase.from("races").insert(raceRows);
  } catch (err) {
    console.warn("Failed to create races:", err);
  } finally {
    isCreating = false;
  }
}

// Transition race statuses based on current time
async function transitionRaceStatuses() {
  const now = new Date().toISOString();

  // upcoming -> live (start_time has passed)
  await supabase
    .from("races")
    .update({ status: "live" })
    .eq("status", "upcoming")
    .lte("start_time", now);

  // live -> finished (end_time has passed)
  const { data: expiredRaces } = await supabase
    .from("races")
    .select("id")
    .eq("status", "live")
    .lte("end_time", now);

  if (expiredRaces && expiredRaces.length > 0) {
    for (const race of expiredRaces) {
      const { data: priceData } = await supabase
        .from("race_prices")
        .select("prices")
        .eq("race_id", race.id)
        .order("recorded_at", { ascending: false })
        .limit(1);

      let winningCoin: string | null = null;
      if (priceData && priceData.length > 0) {
        const prices = priceData[0].prices as any[];
        const best = prices.reduce((a: any, b: any) =>
          (a.percentChange ?? 0) > (b.percentChange ?? 0) ? a : b
        );
        winningCoin = best.symbol;
      }

      await supabase
        .from("races")
        .update({ status: "finished", winning_coin: winningCoin })
        .eq("id", race.id);
    }
  }
}

// Create new batch of races when no active races exist
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

// Poll prices for ALL live races and write snapshots to Supabase
async function pollAllLiveRaces() {
  const { data: liveRaces } = await supabase
    .from("races")
    .select("id, coins")
    .eq("status", "live");

  if (!liveRaces || liveRaces.length === 0) return;

  // Collect all unique addresses across all live races
  const allAddresses = new Set<string>();
  for (const race of liveRaces) {
    for (const coin of race.coins as any[]) {
      allAddresses.add(coin.address);
    }
  }

  // Fetch prices once for all coins
  const prices = await getMultipleTokenPrices([...allAddresses]);
  if (prices.length === 0) return;

  // Write a price snapshot for each live race
  const snapshots = liveRaces.map((race) => {
    const coins = race.coins as any[];
    const priceData = coins.map((coin: any) => {
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
    return { race_id: race.id, prices: priceData };
  });

  await supabase.from("race_prices").insert(snapshots);
}

// Main tick: transition statuses, then create new races if needed
async function tick() {
  await transitionRaceStatuses();
  await createRacesIfNeeded();
}

export function useRaceScheduler() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const priceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    tick();

    // Status transitions & race creation every 3s
    intervalRef.current = setInterval(tick, TICK_INTERVAL_MS);

    // Price polling for all live races every PRICE_POLL_INTERVAL
    pollAllLiveRaces();
    priceIntervalRef.current = setInterval(pollAllLiveRaces, PRICE_POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (priceIntervalRef.current) {
        clearInterval(priceIntervalRef.current);
      }
    };
  }, []);
}