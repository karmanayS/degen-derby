import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { LeaderboardEntry } from "../types";

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leaderboard")
      .select("*")
      .order("degen_score", { ascending: false })
      .limit(50);

    if (!error && data) {
      setEntries(
        data.map((row: any) => ({
          walletAddress: row.wallet_address,
          degenScore: row.degen_score,
          totalRaces: row.total_races,
          wins: row.wins,
          winStreak: row.win_streak,
          totalEarned: row.total_earned,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  return { entries, loading, refetch: fetchLeaderboard };
}