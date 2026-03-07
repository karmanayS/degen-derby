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
      .order("total_earned", { ascending: false })
      .limit(10);

    if (!error && data) {
      // Fetch usernames for all wallet addresses
      const wallets = data.map((row: any) => row.wallet_address);
      const { data: usersData } = await supabase
        .from("users")
        .select("wallet_address, username")
        .in("wallet_address", wallets);

      const usernameMap: Record<string, string> = {};
      if (usersData) {
        for (const u of usersData) {
          usernameMap[u.wallet_address] = u.username;
        }
      }

      setEntries(
        data.map((row: any) => ({
          walletAddress: row.wallet_address,
          username: usernameMap[row.wallet_address] ?? "",
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