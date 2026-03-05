import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { WalletButton } from "../components/common/WalletButton";
import { SkrBadge } from "../components/common/SkrBadge";
import { useAuthorization } from "../utils/useAuthorization";
import { useSkrStatus } from "../hooks/useSkrStatus";
import { supabase } from "../lib/supabase";
import { LeaderboardEntry } from "../types";
import { COLORS } from "../lib/constants";

export function ProfileScreen() {
  const { selectedAccount } = useAuthorization();
  const { hasSkr, skrBalance, loading: skrLoading } = useSkrStatus();
  const [stats, setStats] = useState<LeaderboardEntry | null>(null);

  const walletAddress = selectedAccount?.publicKey.toBase58();

  useEffect(() => {
    if (!walletAddress) {
      setStats(null);
      return;
    }

    const fetchStats = async () => {
      const { data } = await supabase
        .from("leaderboard")
        .select("*")
        .eq("wallet_address", walletAddress)
        .single();

      if (data) {
        setStats({
          walletAddress: data.wallet_address,
          degenScore: data.degen_score,
          totalRaces: data.total_races,
          wins: data.wins,
          winStreak: data.win_streak,
          totalEarned: data.total_earned,
        });
      }
    };

    fetchStats();
  }, [walletAddress]);

  if (!selectedAccount) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.title}>PROFILE</Text>
          <Text style={styles.subtitle}>Connect your wallet to view stats</Text>
          <WalletButton />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>PROFILE</Text>

      {/* Wallet */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>WALLET</Text>
        <Text style={styles.walletAddress}>{walletAddress}</Text>
        <View style={styles.walletActions}>
          <WalletButton />
        </View>
      </View>

      {/* SKR Status */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>SKR STATUS</Text>
        {skrLoading ? (
          <Text style={styles.loadingText}>Checking...</Text>
        ) : hasSkr ? (
          <View style={styles.skrActive}>
            <SkrBadge balance={skrBalance} />
            <Text style={styles.skrPerks}>
              VIP races, higher pots, 1-hour races unlocked
            </Text>
          </View>
        ) : (
          <View style={styles.skrInactive}>
            <Text style={styles.noSkrText}>No SKR tokens found</Text>
            <Text style={styles.skrHint}>
              Hold SKR to unlock VIP races and exclusive features
            </Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>YOUR STATS</Text>
        {stats ? (
          <View style={styles.statsGrid}>
            <StatBox label="Degen Score" value={stats.degenScore.toString()} color={COLORS.warning} />
            <StatBox label="Total Races" value={stats.totalRaces.toString()} />
            <StatBox label="Wins" value={stats.wins.toString()} color={COLORS.primary} />
            <StatBox label="Win Streak" value={stats.winStreak.toString()} />
            <StatBox
              label="Total Earned"
              value={`${stats.totalEarned.toFixed(2)} SOL`}
              color={COLORS.primary}
            />
          </View>
        ) : (
          <Text style={styles.noStatsText}>
            No races yet. Jump in!
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={statStyles.box}>
      <Text style={[statStyles.value, color ? { color } : null]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    minWidth: "45%",
  },
  value: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "bold",
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 4,
    letterSpacing: 0.5,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
    textAlign: "center",
    paddingVertical: 16,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  cardLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 10,
  },
  walletAddress: {
    color: COLORS.text,
    fontSize: 12,
    fontFamily: "monospace",
    marginBottom: 12,
  },
  walletActions: {
    alignItems: "flex-start",
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  skrActive: {
    alignItems: "center",
    gap: 10,
  },
  skrPerks: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: "center",
  },
  skrInactive: {
    alignItems: "center",
    gap: 6,
  },
  noSkrText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  skrHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  noStatsText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 12,
  },
});