// Client-side price polling fallback
// Use this when edge function cron isn't set up yet
// Polls DexScreener directly from the phone and writes to Supabase

import { useEffect, useRef } from "react";
import { getMultipleTokenPrices } from "../lib/dexscreener";
import { supabase } from "../lib/supabase";
import { Race } from "../types";
import { PRICE_POLL_INTERVAL } from "../lib/constants";

export function useClientPricePolling(race: Race | null) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!race || race.status !== "live") {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const poll = async () => {
      const addresses = race.coins.map((c) => c.address);
      const prices = await getMultipleTokenPrices(addresses);

      if (prices.length === 0) return;

      const priceData = race.coins.map((coin) => {
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

      // Insert price snapshot — other clients subscribed via Realtime will see this too
      await supabase.from("race_prices").insert({
        race_id: race.id,
        prices: priceData,
      });
    };

    // Poll immediately, then every PRICE_POLL_INTERVAL
    poll();
    intervalRef.current = setInterval(poll, PRICE_POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [race?.id, race?.status]);
}