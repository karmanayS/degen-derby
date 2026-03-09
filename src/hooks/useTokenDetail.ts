import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  getTokenDetailedInfo,
  DexScreenerPair,
} from "../lib/dexscreener";
import { CoinPrice } from "../types";

export interface PricePoint {
  t: number;
  value: number;
}

interface TokenDetailResult {
  dexData: DexScreenerPair | null;
  priceHistory: PricePoint[];
  loading: boolean;
  error: string | null;
}

export function useTokenDetail(
  address: string | null,
  raceId: string,
  latestPrices?: CoinPrice[]
): TokenDetailResult {
  const [dexData, setDexData] = useState<DexScreenerPair | null>(null);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setDexData(null);
      setPriceHistory([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      // Fetch DexScreener detailed info and price history in parallel
      const [dexResult, historyResult] = await Promise.all([
        getTokenDetailedInfo(address).catch(() => null),
        supabase
          .from("race_prices")
          .select("prices, recorded_at")
          .eq("race_id", raceId)
          .order("recorded_at", { ascending: true }),
      ]);

      if (cancelled) return;

      setDexData(dexResult);

      // Extract price history for this specific token
      const points: PricePoint[] = [];
      if (historyResult.data) {
        historyResult.data.forEach(
          (row: { prices: CoinPrice[]; recorded_at: string }, index: number) => {
            const tokenEntry = row.prices?.find(
              (p: CoinPrice) => p.address === address
            );
            if (tokenEntry) {
              points.push({ t: index, value: tokenEntry.percentChange });
            }
          }
        );
      }

      // Append latest live price if available
      if (latestPrices) {
        const liveEntry = latestPrices.find((p) => p.address === address);
        if (liveEntry) {
          const lastT = points.length > 0 ? points[points.length - 1].t + 1 : 0;
          points.push({ t: lastT, value: liveEntry.percentChange });
        }
      }

      setPriceHistory(points);

      if (historyResult.error) {
        setError(historyResult.error.message);
      }

      setLoading(false);
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [address, raceId]);

  return { dexData, priceHistory, loading, error };
}
