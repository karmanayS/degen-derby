import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { CoinPrice } from "../types";
import { HorsePosition, calculatePositions } from "../lib/race-engine";

export function useRaceLive(raceId: string | null) {
  const [positions, setPositions] = useState<HorsePosition[]>([]);
  const [latestPrices, setLatestPrices] = useState<CoinPrice[]>([]);
  const [isLive, setIsLive] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!raceId) return;

    // Fetch existing price snapshots
    const fetchLatest = async () => {
      const { data } = await supabase
        .from("race_prices")
        .select("*")
        .eq("race_id", raceId)
        .order("recorded_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const prices: CoinPrice[] = data[0].prices;
        setLatestPrices(prices);
        setPositions(calculatePositions(prices));
        setIsLive(true);
      }
    };

    fetchLatest();

    // Subscribe to new price snapshots
    const channel = supabase
      .channel(`race-prices-${raceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "race_prices",
          filter: `race_id=eq.${raceId}`,
        },
        (payload: any) => {
          const prices: CoinPrice[] = payload.new.prices;
          setLatestPrices(prices);
          setPositions(calculatePositions(prices));
          setIsLive(true);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [raceId]);

  return { positions, latestPrices, isLive };
}