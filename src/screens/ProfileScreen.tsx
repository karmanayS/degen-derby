import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { WalletButton } from "../components/common/WalletButton";
import { useAuthorization } from "../utils/useAuthorization";
import { useSkrStatus } from "../hooks/useSkrStatus";
import { supabase } from "../lib/supabase";
import { LeaderboardEntry } from "../types";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const grassTexture = require("../../assets/images/grass-turf.png");

const C = {
  green: "#00FF88",
  sand: "#C2A878",
  sandDark: "#A68A64",
  sandLight: "#D7C29E",
  cream: "#EDEDED",
  brownDark: "#16100A",
  muted: "#6D4C41",
  gold: "#F0D050",
  danger: "#FF4444",
};

interface BetHistoryItem {
  id: string;
  raceId: string;
  raceCoin: string;
  amount: number;
  payout: number | null;
  result: "won" | "lost" | "pending";
  date: string;
}

export function ProfileScreen() {
  const { selectedAccount } = useAuthorization();
  const { hasSkr } = useSkrStatus();
  const [stats, setStats] = useState<LeaderboardEntry | null>(null);
  const [username, setUsername] = useState<string>("");
  const [betHistory, setBetHistory] = useState<BetHistoryItem[]>([]);

  const walletAddress = selectedAccount?.publicKey.toBase58();

  useEffect(() => {
    if (!walletAddress) {
      setStats(null);
      setUsername("");
      setBetHistory([]);
      return;
    }

    const fetchProfile = async () => {
      // Fetch username
      const { data: userData } = await supabase
        .from("users")
        .select("username")
        .eq("wallet_address", walletAddress)
        .limit(1);

      if (userData && userData.length > 0) {
        setUsername(userData[0].username);
      }

      // Fetch stats
      const { data } = await supabase
        .from("leaderboard")
        .select("*")
        .eq("wallet_address", walletAddress)
        .single();

      if (data) {
        setStats({
          walletAddress: data.wallet_address,
          username: "",
          degenScore: data.degen_score,
          totalRaces: data.total_races,
          wins: data.wins,
          winStreak: data.win_streak,
          totalEarned: data.total_earned,
        });
      }

      // Fetch bet history
      const { data: betsData } = await supabase
        .from("bets")
        .select("id, race_id, picked_coin, amount, payout, created_at")
        .eq("wallet_address", walletAddress)
        .order("created_at", { ascending: false })
        .limit(10);

      if (betsData && betsData.length > 0) {
        setBetHistory(
          betsData.map((b: any) => {
            const payout = b.payout ?? 0;
            const result: "won" | "lost" | "pending" =
              b.payout === null ? "pending" : payout > 0 ? "won" : "lost";
            return {
              id: b.id,
              raceId: b.race_id,
              raceCoin: b.picked_coin,
              amount: b.amount,
              payout,
              result,
              date: formatRelativeDate(b.created_at),
            };
          })
        );
      }
    };

    fetchProfile();
  }, [walletAddress]);

  if (!selectedAccount) {
    return (
      <View style={styles.wrapper}>
        <ImageBackground
          source={grassTexture}
          style={StyleSheet.absoluteFillObject}
          imageStyle={{ resizeMode: "repeat" }}
        />
        <LinearGradient
          colors={["#0A1A0ECC", "#1B5E2055", "#0A0A0F99", "#2E1808CC", "#4A2E18DD", "#3A2010EE"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.centered}>
          <Text style={styles.centeredTitle}>PROFILE</Text>
          <Text style={styles.centeredSubtitle}>Connect your wallet to view stats</Text>
          <WalletButton />
        </View>
      </View>
    );
  }

  const displayName = username || `${walletAddress!.slice(0, 4)}...${walletAddress!.slice(-4)}`;

  return (
    <View style={styles.wrapper}>
      <ImageBackground
        source={grassTexture}
        style={StyleSheet.absoluteFillObject}
        imageStyle={{ resizeMode: "repeat" }}
      />
      <LinearGradient
        colors={["#0A1A0ECC", "#1B5E2055", "#0A0A0F99", "#2E1808CC", "#4A2E18DD", "#3A2010EE"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={["#00000000", "#00000000", "#1A100899", "#2E1F14AA"]}
        locations={[0, 0.5, 0.75, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* User card */}
        <View style={styles.userCard}>
          <Text style={styles.username}>{displayName}</Text>
          <Text style={styles.walletLabel}>WALLET</Text>
          <Text style={styles.walletAddress}>
            {walletAddress!.slice(0, 8)}...{walletAddress!.slice(-8)}
          </Text>
          {hasSkr && (
            <View style={styles.skrBadge}>
              <Text style={styles.skrText}>SKR HOLDER</Text>
            </View>
          )}
          <View style={styles.walletActions}>
            <WalletButton />
          </View>
        </View>

        {/* Stats bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>RACES</Text>
            <Text style={styles.statValue}>{stats?.totalRaces ?? 0}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>WINS</Text>
            <Text style={[styles.statValue, { color: C.green }]}>{stats?.wins ?? 0}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>SOL EARNED</Text>
            <Text style={[styles.statValue, { color: C.green }]}>
              {stats?.totalEarned?.toFixed(2) ?? "0.00"}
            </Text>
          </View>
        </View>

        {/* Bet history */}
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>BET HISTORY</Text>
          {betHistory.length === 0 ? (
            <Text style={styles.emptyText}>No bet history</Text>
          ) : (
            betHistory.map((bet) => (
              <View key={bet.id} style={styles.betRow}>
                <View style={styles.betInfo}>
                  <Text style={styles.betRace}>Race #{bet.raceId.slice(0, 6)}</Text>
                  <Text style={styles.betCoin}>{bet.raceCoin} - {bet.amount} SOL</Text>
                </View>
                <View style={styles.betResult}>
                  <Text
                    style={[
                      styles.betResultText,
                      { color: bet.result === "won" ? C.green : bet.result === "lost" ? C.danger : C.muted },
                    ]}
                  >
                    {bet.result === "won"
                      ? `+${(bet.payout ?? 0).toFixed(2)} SOL`
                      : bet.result === "lost"
                        ? "LOST"
                        : "PENDING"}
                  </Text>
                  <Text style={styles.betDate}>{bet.date}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function formatRelativeDate(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#0A1A0E",
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  centeredTitle: {
    color: C.cream,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
  },
  centeredSubtitle: {
    color: C.muted,
    fontSize: 14,
  },
  userCard: {
    backgroundColor: C.sand + "18",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.sand + "33",
    marginBottom: 12,
  },
  username: {
    color: C.cream,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 12,
  },
  walletLabel: {
    color: C.sandDark,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 4,
  },
  walletAddress: {
    color: C.sandLight,
    fontSize: 12,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  skrBadge: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: C.gold + "15",
    borderWidth: 1,
    borderColor: C.gold + "44",
  },
  skrText: {
    color: C.gold,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
  },
  walletActions: {
    marginTop: 12,
  },
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: C.sand + "18",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.sand + "33",
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: C.sand + "33",
    marginHorizontal: 4,
  },
  statLabel: {
    color: C.sandDark,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 2,
  },
  statValue: {
    color: C.cream,
    fontSize: 16,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  historySection: {
    marginBottom: 16,
  },
  historyTitle: {
    color: C.sand,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  emptyText: {
    color: C.muted,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 20,
  },
  betRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.brownDark + "88",
  },
  betInfo: {
    flex: 1,
  },
  betRace: {
    color: C.sandLight,
    fontSize: 13,
    fontWeight: "700",
  },
  betCoin: {
    color: C.muted,
    fontSize: 10,
    marginTop: 2,
  },
  betResult: {
    alignItems: "flex-end",
  },
  betResultText: {
    fontSize: 13,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  betDate: {
    color: C.muted,
    fontSize: 9,
    marginTop: 2,
  },
});