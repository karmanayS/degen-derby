import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
} from "react-native";
import { Race } from "../../types";
import WoodGrainTexture from "./WoodGrainTexture";
import { s, fs, vs } from "../../lib/responsive";

const T = {
  cardBg: "#221710",
  cardSurface: "#2E1F14",
  green: "#00FF88",
  gold: "#F0D050",
  greenDim: "#1B5E20",
  red: "#FF4444",
  sand: "#C2A878",
  sandLight: "#D7C29E",
  brownDark: "#16100A",
  brownWood: "#3A2818",
  brownGrain: "#2A1C12",
  muted: "#6D4C41",
  cream: "#EDEDED",
};

interface RaceCardProps {
  race: Race;
  onPress: () => void;
}

function StatusBadge({ status }: { status: Race["status"] }) {
  const isLive = status === "live";
  const isUpcoming = status === "upcoming";

  if (isLive) {
    return (
      <View style={[styles.badge, { backgroundColor: T.green + "18", borderColor: T.green + "55" }]}>
        <View style={styles.liveDot} />
        <Text style={[styles.badgeText, { color: T.green }]}>LIVE</Text>
      </View>
    );
  }

  const color = isUpcoming ? T.sand : T.muted + "CC";
  const label = isUpcoming ? "UPCOMING" : "FINISHED";
  return (
    <View style={[styles.badge, { borderColor: color + "44" }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff > 0) {
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  }

  const ago = Math.abs(diff);
  const mins = Math.floor(ago / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function useCountdown(targetTime: string, enabled: boolean) {
  const [remaining, setRemaining] = useState(() => {
    const diff = new Date(targetTime).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  });

  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      const diff = new Date(targetTime).getTime() - Date.now();
      setRemaining(Math.max(0, Math.floor(diff / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetTime, enabled]);

  return remaining;
}

function formatCountdown(seconds: number): string {
  if (seconds >= 3600) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function RaceCard({ race, onPress }: RaceCardProps) {
  const previewCoins = race.coins.slice(0, 5);
  const isLive = race.status === "live";
  const isUpcoming = race.status === "upcoming";
  const liveRemaining = useCountdown(race.endTime, isLive);
  const upcomingRemaining = useCountdown(race.startTime, isUpcoming);

  return (
    <Pressable
      style={[styles.card, isLive && styles.liveCard]}
      onPress={onPress}
    >
      <WoodGrainTexture opacity={0.45} borderRadius={16} />

      <View style={styles.header}>
        <StatusBadge status={race.status} />
        <Text style={[styles.time, isLive && { color: T.green }]}>
          {isUpcoming
            ? `Starts in ${formatCountdown(upcomingRemaining)}`
            : isLive
              ? `Ends in ${formatCountdown(liveRemaining)}`
              : formatTime(race.endTime)}
        </Text>
      </View>

      <View style={styles.coinsRow}>
        {previewCoins.map((coin) => (
          <View key={coin.address} style={styles.coinItem}>
            <View style={styles.coinRing}>
              {coin.logo ? (
                <Image source={{ uri: coin.logo }} style={styles.coinLogo} />
              ) : (
                <View style={[styles.coinLogo, { backgroundColor: T.brownGrain, justifyContent: "center", alignItems: "center" }]}>
                  <Text style={{ color: T.gold, fontSize: fs(14), fontWeight: "bold" }}>{coin.symbol[0]}</Text>
                </View>
              )}
            </View>
            <Text style={styles.coinSymbol}>{coin.symbol}</Text>
          </View>
        ))}
      </View>

      <View style={styles.statsBar}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>POT</Text>
          <Text style={[styles.statValue, isLive && { color: T.green }]}>
            {race.totalPot} SOL
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statLabel}>RIDERS</Text>
          <Text style={styles.statValue}>{race.playerCount}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statLabel}>COINS</Text>
          <Text style={styles.statValue}>{race.coins.length}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.cardBg,
    borderRadius: s(16),
    marginHorizontal: s(14),
    marginVertical: vs(6),
    borderWidth: 1.5,
    borderColor: T.brownWood + "88",
    overflow: "hidden",
  },
  liveCard: {
    borderWidth: 2.5,
    borderColor: T.green + "99",
    shadowColor: T.green,
    shadowOpacity: 0.25,
    shadowRadius: s(12),
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: s(16),
    paddingTop: vs(14),
    paddingBottom: vs(12),
    zIndex: 1,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: s(10),
    paddingVertical: vs(4),
    borderRadius: s(6),
    borderWidth: 1,
    borderColor: T.brownWood + "66",
  },
  liveDot: {
    width: s(6),
    height: s(6),
    borderRadius: s(3),
    backgroundColor: T.green,
    marginRight: s(6),
  },
  badgeText: {
    fontSize: fs(10),
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  time: {
    color: T.sand + "AA",
    fontSize: fs(11),
    fontWeight: "600",
  },
  coinsRow: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: s(16),
    paddingBottom: vs(14),
    gap: s(14),
    zIndex: 1,
  },
  coinItem: {
    alignItems: "center",
    gap: s(5),
  },
  coinRing: {
    width: s(42),
    height: s(42),
    borderRadius: s(21),
    backgroundColor: T.brownGrain,
    borderWidth: 2,
    borderColor: T.gold + "44",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: T.green,
    shadowOpacity: 0.08,
    shadowRadius: s(6),
    shadowOffset: { width: 0, height: 0 },
  },
  coinLogo: {
    width: s(30),
    height: s(30),
    borderRadius: s(15),
  },
  coinSymbol: {
    color: T.gold + "CC",
    fontSize: fs(9),
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.brownGrain + "DD",
    borderTopWidth: 1,
    borderTopColor: T.brownDark,
    paddingVertical: vs(10),
    paddingHorizontal: s(16),
    zIndex: 1,
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    color: T.muted,
    fontSize: fs(8),
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: vs(2),
  },
  statValue: {
    color: T.cream,
    fontSize: fs(14),
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  statDivider: {
    width: 1,
    height: vs(22),
    backgroundColor: T.brownDark,
  },
});