// Client-side race lifecycle manager
// - Transitions race statuses based on time (upcoming -> live -> finished)
// - Polls prices in memory for live races
// - Race creation is handled server-side via pg_cron + create-race edge function

import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import Config from "../lib/config";
import { getMultipleTokenPrices } from "../lib/dexscreener";
import { CoinPrice } from "../types";

const TICK_INTERVAL_MS = 3000; // check statuses every 3 seconds
const PRICE_POLL_MS = 1000; // poll prices every second

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
      // Write final price snapshot from in-memory store
      const finalPrices = livePricesStore.get(race.id);
      if (finalPrices && finalPrices.length > 0) {
        await supabase.from("race_prices").insert({
          race_id: race.id,
          prices: finalPrices,
        });
      }

      // Call settle-race edge function for payouts (runs before marking finished)
      try {
        await fetch(
          `${Config.SUPABASE_URL}/functions/v1/settle-race`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Config.SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ raceId: race.id }),
          }
        );
      } catch (err) {
        console.warn(`Failed to settle race ${race.id}:`, err);
      }

      // Always mark race as finished (fallback in case settle-race fails)
      await supabase
        .from("races")
        .update({ status: "finished" })
        .eq("id", race.id)
        .neq("status", "finished");

      // Clean up in-memory store
      livePricesStore.delete(race.id);
      priceListeners.delete(race.id);
    }
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