import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ImageBackground,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLeaderboard } from "../hooks/useLeaderboard";
import { useAuthorization } from "../utils/useAuthorization";
import { LeaderboardEntry } from "../types";
import { s, fs, vs } from "../lib/responsive";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const grassTexture = require("../../assets/images/grass-turf.png");

const C = {
  sand: "#C2A878",
  sandDark: "#A68A64",
  sandLight: "#D7C29E",
  cream: "#EDEDED",
  brownDark: "#16100A",
  brownGrain: "#2A1C12",
  muted: "#6D4C41",
  gold: "#F0D050",
  green: "#00FF88",
};

function LeaderboardRow({
  entry,
  rank,
  isCurrentUser,
}: {
  entry: LeaderboardEntry;
  rank: number;
  isCurrentUser: boolean;
}) {
  const rankColor =
    rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : rank === 3 ? "#CD7F32" : C.muted;
  const isTop3 = rank <= 3;

  const displayName =
    entry.username ||
    `${entry.walletAddress.slice(0, 4)}...${entry.walletAddress.slice(-4)}`;
  const truncatedWallet = `${entry.walletAddress.slice(0, 4)}...${entry.walletAddress.slice(-4)}`;

  return (
    <View style={[styles.row, isCurrentUser && styles.currentUser, isTop3 && styles.top3Row]}>
      <View style={styles.rankContainer}>
        <Text style={[styles.rank, { color: rankColor }]}>#{rank}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.username} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={styles.wallet} numberOfLines={1}>
          {truncatedWallet}
        </Text>
      </View>

      <Text style={styles.matches}>{entry.totalRaces}</Text>

      <Text style={styles.earned}>{entry.totalEarned.toFixed(2)} SOL</Text>
    </View>
  );
}

export function LeaderboardScreen() {
  const { entries, loading, refetch } = useLeaderboard();
  const { selectedAccount } = useAuthorization();
  const playerAddress = selectedAccount?.publicKey.toBase58();

  const totalSol = entries.reduce((s, e) => s + e.totalEarned, 0);
  const totalRaces = entries.reduce((s, e) => s + e.totalRaces, 0);

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

      <View style={styles.header}>
        <View style={styles.headerStat}>
          <Text style={styles.headerStatLabel}>PLAYERS</Text>
          <Text style={styles.headerStatValue}>{entries.length}</Text>
        </View>
        <View style={styles.headerDivider} />
        <View style={styles.headerStat}>
          <Text style={styles.headerStatLabel}>TOTAL SOL</Text>
          <Text style={styles.headerStatValue}>{totalSol.toFixed(1)}</Text>
        </View>
        <View style={styles.headerDivider} />
        <View style={styles.headerStat}>
          <Text style={styles.headerStatLabel}>RACES</Text>
          <Text style={styles.headerStatValue}>{totalRaces}</Text>
        </View>
      </View>

      <View style={styles.colHeaders}>
        <Text style={[styles.colHeader, { width: s(36), textAlign: "center" }]}>RANK</Text>
        <Text style={[styles.colHeader, { flex: 1, marginLeft: s(14) }]}>PLAYER</Text>
        <Text style={[styles.colHeader, { width: s(46), textAlign: "center" }]}>RACES</Text>
        <Text style={[styles.colHeader, { width: s(70), textAlign: "right" }]}>WON</Text>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.walletAddress}
        renderItem={({ item, index }) => (
          <LeaderboardRow
            entry={item}
            rank={index + 1}
            isCurrentUser={item.walletAddress === playerAddress}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refetch}
            tintColor={C.green}
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
  wrapper: {
    flex: 1,
    backgroundColor: "#0A1A0E",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: vs(10),
    paddingHorizontal: s(12),
    marginHorizontal: s(16),
    marginTop: vs(12),
    marginBottom: vs(8),
    backgroundColor: C.sand + "18",
    borderRadius: s(10),
    borderWidth: 1,
    borderColor: C.sand + "33",
  },
  headerStat: {
    flex: 1,
    alignItems: "center",
  },
  headerDivider: {
    width: 1,
    height: vs(24),
    backgroundColor: C.sand + "33",
    marginHorizontal: s(4),
  },
  headerStatLabel: {
    color: C.sandDark,
    fontSize: fs(8),
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: vs(2),
  },
  headerStatValue: {
    color: C.cream,
    fontSize: fs(14),
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  colHeaders: {
    flexDirection: "row",
    paddingHorizontal: s(12),
    paddingVertical: vs(8),
    borderBottomWidth: 1,
    borderBottomColor: C.brownDark + "88",
  },
  colHeader: {
    color: C.sand,
    fontSize: fs(9),
    fontWeight: "700",
    letterSpacing: 1,
  },
  list: {
    paddingBottom: vs(20),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: vs(11),
    paddingHorizontal: s(12),
    borderBottomWidth: 1,
    borderBottomColor: C.brownDark + "88",
    backgroundColor: "transparent",
  },
  top3Row: {
    backgroundColor: C.brownGrain + "66",
  },
  currentUser: {
    backgroundColor: C.green + "10",
    borderLeftWidth: 3,
    borderLeftColor: C.green,
  },
  rankContainer: {
    width: s(36),
    alignItems: "center",
  },
  rank: {
    fontSize: fs(13),
    fontWeight: "900",
  },
  info: {
    flex: 1,
    marginLeft: s(4),
  },
  username: {
    color: C.sandLight,
    fontSize: fs(13),
    fontWeight: "700",
  },
  wallet: {
    color: C.muted,
    fontSize: fs(10),
    marginTop: vs(1),
  },
  matches: {
    color: C.sand,
    fontSize: fs(12),
    fontWeight: "700",
    width: s(46),
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  earned: {
    color: C.green,
    fontSize: fs(13),
    fontWeight: "900",
    width: s(70),
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  empty: {
    paddingVertical: vs(60),
    alignItems: "center",
  },
  emptyText: {
    color: C.muted,
    fontSize: fs(14),
  },
});