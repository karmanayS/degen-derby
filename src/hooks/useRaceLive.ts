import { useEffect, useState } from "react";
import { CoinPrice } from "../types";
import { HorsePosition, calculatePositions } from "../lib/race-engine";
import { subscribeLivePrices } from "./useRaceScheduler";

export function useRaceLive(raceId: string | null) {
  const [positions, setPositions] = useState<HorsePosition[]>([]);
  const [latestPrices, setLatestPrices] = useState<CoinPrice[]>([]);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!raceId) return;

    const unsubscribe = subscribeLivePrices(raceId, (prices) => {
      setLatestPrices(prices);
      setPositions(calculatePositions(prices));
      setIsLive(true);
    });

    return unsubscribe;
  }, [raceId]);

  return { positions, latestPrices, isLive };
}