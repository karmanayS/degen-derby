import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from "react-native";
import { useLeaderboard } from "../hooks/useLeaderboard";
import { useAuthorization } from "../utils/useAuthorization";
import { LeaderboardEntry } from "../types";
import { COLORS } from "../lib/constants";

export function LeaderboardScreen() {
  const { entries, loading, refetch } = useLeaderboard();
  const { selectedAccount } = useAuthorization();

  const playerAddress = selectedAccount?.publicKey.toBase58();

  const renderEntry = ({
    item,
    index,
  }: {
    item: LeaderboardEntry;
    index: number;
  }) => {
    const isPlayer = item.walletAddress === playerAddress;
    const rank = index + 1;
    const rankDisplay =
      rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;

    const truncated = `${item.walletAddress.slice(0, 4)}...${item.walletAddress.slice(-4)}`;

    return (
      <View style={[styles.row, isPlayer && styles.playerRow]}>
        <Text style={styles.rank}>{rankDisplay}</Text>
        <View style={styles.playerInfo}>
          <Text style={[styles.address, isPlayer && styles.playerAddress]}>
            {truncated}
            {isPlayer ? " (You)" : ""}
          </Text>
          <Text style={styles.stats}>
            {item.wins}W · {item.winStreak} streak
          </Text>
        </View>
        <View style={styles.scoreCol}>
          <Text style={styles.score}>{item.degenScore}</Text>
          <Text style={styles.earned}>
            {item.totalEarned.toFixed(2)} SOL
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LEADERBOARD</Text>

      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerText, { width: 40 }]}>#</Text>
        <Text style={[styles.headerText, { flex: 1 }]}>PLAYER</Text>
        <Text style={[styles.headerText, { textAlign: "right" }]}>
          SCORE
        </Text>
      </View>

      <FlatList
        data={entries}
        renderItem={renderEntry}
        keyExtractor={(item) => item.walletAddress}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refetch}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {loading ? "Loading..." : "No entries yet. Be the first!"}
            </Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
    textAlign: "center",
    paddingVertical: 16,
  },
  headerRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  headerText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
  },
  list: {
    paddingBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  playerRow: {
    backgroundColor: COLORS.surface,
  },
  rank: {
    width: 40,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "bold",
  },
  playerInfo: {
    flex: 1,
  },
  address: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
  },
  playerAddress: {
    color: COLORS.primary,
  },
  stats: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  scoreCol: {
    alignItems: "flex-end",
  },
  score: {
    color: COLORS.warning,
    fontSize: 16,
    fontWeight: "bold",
  },
  earned: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  empty: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});