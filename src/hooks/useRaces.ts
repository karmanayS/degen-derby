import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { Race } from "../types";

function mapRow(row: any): Race {
  return {
    id: row.id,
    coins: row.coins,
    winningCoin: row.winning_coin,
    entryFee: row.entry_fee,
    raceDuration: row.race_duration,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
    totalPot: row.total_pot,
    playerCount: row.bets?.[0]?.count ?? 0,
    createdAt: row.created_at,
  };
}

export function useRaces() {
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const initialLoadDone = useRef(false);

  const fetchRaces = async () => {
    const { data, error } = await supabase
      .from("races")
      .select("*, bets(count)")
      .order("start_time", { ascending: false })
      .limit(20);

    if (!error && data) {
      setRaces(data.map(mapRow));
    }
  };

  useEffect(() => {
    // Initial load with loader
    (async () => {
      await fetchRaces();
      setLoading(false);
      initialLoadDone.current = true;
    })();

    // Subscribe to race updates -- silent refetch, no loader
    let debounceTimer: ReturnType<typeof setTimeout>;
    const subscription = supabase
      .channel("races-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "races" },
        () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(fetchRaces, 1500);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      subscription.unsubscribe();
    };
  }, []);

  return { races, loading, refetch: fetchRaces };
}