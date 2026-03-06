// Global race lifecycle manager
// - Creates new races when none exist
// - Transitions race statuses based on time (upcoming -> live -> finished)
// - Runs independently of which screen the user is on

import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { getMultipleTokenPrices, getTrendingTokens } from "../lib/dexscreener";

const LOBBY_DURATION_S = 60; // 1 minute to place bets
const RACE_DURATION_S = 300; // 5 minute race
const TICK_INTERVAL_MS = 3000; // check statuses every 3 seconds

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

let isCreating = false;

async function createRace() {
  if (isCreating) return;
  isCreating = true;

  try {
    const coins = await getTrendingTokens();
    if (coins.length < 5) return;

    const selected = pickRandom(coins, 5);

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
  // First fetch live races that should finish so we can determine winners
  const { data: expiredRaces } = await supabase
    .from("races")
    .select("id")
    .eq("status", "live")
    .lte("end_time", now);

  if (expiredRaces && expiredRaces.length > 0) {
    for (const race of expiredRaces) {
      // Get latest price snapshot to determine winner
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

// Check if we need to create a new race
async function createRaceIfNeeded() {
  const { data } = await supabase
    .from("races")
    .select("id, status")
    .in("status", ["upcoming", "live"])
    .limit(1);

  if (!data || data.length === 0) {
    await createRace();
  }
}

// Main tick: transition statuses, then create new race if needed
async function tick() {
  await transitionRaceStatuses();
  await createRaceIfNeeded();
}

export function useRaceScheduler() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Run immediately
    tick();

    // Then tick every 3 seconds
    intervalRef.current = setInterval(tick, TICK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
}