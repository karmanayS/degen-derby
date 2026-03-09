// Client-side race lifecycle manager
// - Transitions race statuses based on time (upcoming -> live -> finished)
// - Uses PumpPortal WebSocket to detect trades and trigger instant price updates
// - DexScreener provides USD prices; PumpPortal signals WHEN to re-fetch
// - Race creation is handled server-side via pg_cron + create-race edge function

import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import Config from "../lib/config";
import { getMultipleTokenPrices } from "../lib/dexscreener";
import { CoinPrice } from "../types";

const TICK_INTERVAL_MS = 3000;
const DEXSCREENER_POLL_MS = 3000; // baseline DexScreener poll
const PUMPPORTAL_WS_URL = "wss://pumpportal.fun/api/data";
// Minimum ms between DexScreener fetches (rate limit: 60 req/min)
const MIN_FETCH_INTERVAL_MS = 1500;

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

  await supabase
    .from("races")
    .update({ status: "live" })
    .eq("status", "upcoming")
    .lte("start_time", now);

  const { data: expiredRaces } = await supabase
    .from("races")
    .select("id")
    .eq("status", "live")
    .lte("end_time", now);

  if (expiredRaces && expiredRaces.length > 0) {
    for (const race of expiredRaces) {
      const finalPrices = livePricesStore.get(race.id);
      if (finalPrices && finalPrices.length > 0) {
        await supabase.from("race_prices").insert({
          race_id: race.id,
          prices: finalPrices,
        });
      }

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

      await supabase
        .from("races")
        .update({ status: "finished" })
        .eq("id", race.id)
        .neq("status", "finished");

      livePricesStore.delete(race.id);
      priceListeners.delete(race.id);
    }
  }
}

// --- Cached live races ---
let cachedLiveRaces: { id: string; coins: any[] }[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 3000;

async function getLiveRacesCached() {
  const now = Date.now();
  if (cachedLiveRaces && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedLiveRaces;
  }
  const { data } = await supabase
    .from("races")
    .select("id, coins")
    .eq("status", "live");
  cachedLiveRaces = data ?? [];
  cacheTimestamp = now;
  return cachedLiveRaces;
}

// --- Price fetching with throttle ---
let lastFetchTimestamp = 0;
let fetchPending = false;

async function fetchAndBroadcastPrices() {
  const now = Date.now();
  if (now - lastFetchTimestamp < MIN_FETCH_INTERVAL_MS) {
    // Schedule a deferred fetch if not already pending
    if (!fetchPending) {
      fetchPending = true;
      setTimeout(() => {
        fetchPending = false;
        fetchAndBroadcastPrices();
      }, MIN_FETCH_INTERVAL_MS - (Date.now() - lastFetchTimestamp));
    }
    return;
  }
  lastFetchTimestamp = now;

  const liveRaces = await getLiveRacesCached();
  if (!liveRaces || liveRaces.length === 0) return;

  const allAddresses = new Set<string>();
  for (const race of liveRaces) {
    for (const coin of race.coins as any[]) {
      allAddresses.add(coin.address);
    }
  }

  // Subscribe pump.fun tokens to WS (idempotent)
  subscribeToPumpTokens([...allAddresses]);

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

    livePricesStore.set(race.id, priceData);
    notifyListeners(race.id, priceData);
  }
}

// --- PumpPortal WebSocket ---
// Detects trades in real-time and triggers immediate DexScreener re-fetch
let pumpWs: WebSocket | null = null;
let subscribedAddresses = new Set<string>();
let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;

function connectPumpPortal() {
  if (pumpWs && pumpWs.readyState === WebSocket.OPEN) return;

  try {
    pumpWs = new WebSocket(PUMPPORTAL_WS_URL);

    pumpWs.onopen = () => {
      console.log("[PumpPortal] Connected");
      if (subscribedAddresses.size > 0) {
        pumpWs?.send(
          JSON.stringify({
            method: "subscribeTokenTrade",
            keys: [...subscribedAddresses],
          })
        );
      }
    };

    pumpWs.onmessage = (event) => {
      try {
        const data = JSON.parse(
          typeof event.data === "string" ? event.data : ""
        );
        if (data.txType === "buy" || data.txType === "sell") {
          // A trade happened - trigger an immediate DexScreener re-fetch
          // This gets us fresh USD prices within ~1-2s of the on-chain trade
          fetchAndBroadcastPrices();
        }
      } catch {
        // ignore
      }
    };

    pumpWs.onerror = () => {
      console.warn("[PumpPortal] WebSocket error");
    };

    pumpWs.onclose = () => {
      console.log("[PumpPortal] Disconnected, reconnecting in 3s...");
      pumpWs = null;
      if (wsReconnectTimer) clearTimeout(wsReconnectTimer);
      wsReconnectTimer = setTimeout(connectPumpPortal, 3000);
    };
  } catch {
    console.warn("[PumpPortal] Failed to connect");
  }
}

function subscribeToPumpTokens(addresses: string[]) {
  const pumpAddresses = addresses.filter((a) => a.endsWith("pump"));
  if (pumpAddresses.length === 0) return;

  const newAddresses = pumpAddresses.filter((a) => !subscribedAddresses.has(a));
  if (newAddresses.length === 0) return;

  for (const a of newAddresses) subscribedAddresses.add(a);

  if (pumpWs && pumpWs.readyState === WebSocket.OPEN) {
    pumpWs.send(
      JSON.stringify({
        method: "subscribeTokenTrade",
        keys: newAddresses,
      })
    );
  }
}

function disconnectPumpPortal() {
  if (wsReconnectTimer) {
    clearTimeout(wsReconnectTimer);
    wsReconnectTimer = null;
  }
  if (pumpWs) {
    pumpWs.onclose = null;
    pumpWs.close();
    pumpWs = null;
  }
  subscribedAddresses.clear();
}

// --- Main tick ---
async function tick() {
  await transitionRaceStatuses();
  await getLiveRacesCached();
}

export function useRaceScheduler() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const priceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Start PumpPortal WebSocket for trade detection
    connectPumpPortal();

    // Status transitions
    tick();
    intervalRef.current = setInterval(tick, TICK_INTERVAL_MS);

    // Baseline DexScreener polling (WS trades trigger extra fetches on top)
    fetchAndBroadcastPrices();
    priceIntervalRef.current = setInterval(
      fetchAndBroadcastPrices,
      DEXSCREENER_POLL_MS
    );

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (priceIntervalRef.current) clearInterval(priceIntervalRef.current);
      disconnectPumpPortal();
    };
  }, []);
}
