import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { HorseLane } from "./HorseLane";
import { HorsePosition } from "../../lib/race-engine";
import { Coin } from "../../types";
import { COLORS } from "../../lib/constants";

interface HorseTrackProps {
  positions: HorsePosition[];
  coins: Coin[];
  playerPick?: string; // coin symbol the player bet on
}

export function HorseTrack({ positions, coins, playerPick }: HorseTrackProps) {
  // Map positions to coin data for display
  const lanes = positions.map((pos) => {
    const coin = coins.find(
      (c) => c.symbol === pos.symbol || c.address === pos.address
    );
    return {
      ...pos,
      name: coin?.name ?? pos.symbol,
      logo: coin?.logo ?? "",
    };
  });

  if (lanes.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.waitingText}>Waiting for race to start...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>HORSE</Text>
        <Text style={[styles.headerLabel, { flex: 1, textAlign: "center" }]}>
          TRACK
        </Text>
        <Text style={[styles.headerLabel, { width: 65, textAlign: "right" }]}>
          GAIN
        </Text>
      </View>

      {/* Lanes — always show in position order (1st at top) */}
      {lanes.map((lane) => (
        <HorseLane
          key={lane.symbol}
          symbol={lane.symbol}
          name={lane.name}
          logo={lane.logo}
          percentChange={lane.percentChange}
          trackPosition={lane.trackPosition}
          rank={lane.rank}
          isPlayerPick={lane.symbol === playerPick}
          totalHorses={lanes.length}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 6,
    marginBottom: 4,
  },
  headerLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    width: 60,
  },
  waitingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 40,
  },
});