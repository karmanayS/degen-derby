// Auto-creates races every RACE_INTERVAL_MS
// Each race: 1 min lobby (upcoming) + 1 min race (live)
// New race created every 4 minutes

import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { getMultipleTokenPrices, getTrendingTokens } from "../lib/dexscreener";

const RACE_INTERVAL_MS = 6 * 60 * 1000; // 6 minutes between race creations
const LOBBY_DURATION_S = 60; // 1 minute to place bets
const RACE_DURATION_S = 300; // 5 minute race

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

async function createRace() {
  try {
    const coins = await getTrendingTokens();
    if (coins.length < 5) return;

    const selected = pickRandom(coins, 5);

    // Fetch current prices for start prices
    const prices = await getMultipleTokenPrices(
      selected.map((c) => c.address)
    );

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

    const startTime = new Date(Date.now() + LOBBY_DURATION_S * 1000);
    const endTime = new Date(
      startTime.getTime() + RACE_DURATION_S * 1000
    );

    await supabase.from("races").insert({
      coins: raceCoins,
      entry_fee: 0.05,
      race_duration: RACE_DURATION_S,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: "upcoming",
      total_pot: 0,
      is_vip: false,
    });
  } catch (err) {
    console.warn("Failed to create race:", err);
  }
}

async function shouldCreateRace(): Promise<boolean> {
  // Check if there's already an upcoming or live race
  const { data } = await supabase
    .from("races")
    .select("id, status")
    .in("status", ["upcoming", "live"])
    .limit(1);

  return !data || data.length === 0;
}

export function useRaceScheduler() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const scheduleCheck = async () => {
      const needsRace = await shouldCreateRace();
      if (needsRace) {
        await createRace();
      }
    };

    // Check immediately on mount
    scheduleCheck();

    // Then check every RACE_INTERVAL_MS
    intervalRef.current = setInterval(scheduleCheck, RACE_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
}