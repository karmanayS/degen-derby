import React from "react";
import { View, StyleSheet } from "react-native";
import { HorseLane } from "./HorseLane";
import { HorsePosition } from "../../lib/race-engine";
import { Coin } from "../../types";
import WoodGrainTexture from "../common/WoodGrainTexture";
import { s, vs } from "../../lib/responsive";

const T = {
  cardBg: "#221710",
  brownWood: "#3A2818",
};

interface HorseTrackProps {
  positions: HorsePosition[];
  coins: Coin[];
  playerPick?: string;
  selectable?: boolean;
  selectedCoin?: string | null;
  onCoinSelect?: (symbol: string) => void;
}

export function HorseTrack({
  positions,
  coins,
  playerPick,
  selectable,
  selectedCoin,
  onCoinSelect,
}: HorseTrackProps) {
  const lanes = positions.map((pos, i) => {
    const coin = coins.find(
      (c) => c.symbol === pos.symbol || c.address === pos.address
    );
    return {
      ...pos,
      name: coin?.name ?? pos.symbol,
      logo: coin?.logo ?? "",
      laneIndex: i,
    };
  });

  // If no positions yet (upcoming), show coins as static lanes
  const displayLanes = lanes.length > 0 ? lanes : coins.map((coin, i) => ({
    symbol: coin.symbol,
    address: coin.address,
    percentChange: 0,
    trackPosition: 42,
    rank: i + 1,
    name: coin.name,
    logo: coin.logo,
    laneIndex: i,
  }));

  return (
    <View style={styles.container}>
      <WoodGrainTexture opacity={0.45} borderRadius={12} />
      <View style={styles.trackBody}>
        {displayLanes.map((lane) => (
          <HorseLane
            key={lane.address ?? lane.symbol}
            symbol={lane.symbol}
            name={lane.name}
            logo={lane.logo}
            percentChange={lane.percentChange}
            trackPosition={lane.trackPosition}
            rank={lane.rank}
            isPlayerPick={lane.symbol === playerPick}
            totalHorses={displayLanes.length}
            laneIndex={lane.laneIndex}
            selectable={selectable}
            isSelected={selectedCoin === lane.symbol}
            onSelect={onCoinSelect}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: vs(8),
    marginHorizontal: s(12),
    borderRadius: s(12),
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: T.brownWood + "88",
    backgroundColor: T.cardBg,
  },
  trackBody: {
    paddingVertical: vs(4),
    zIndex: 1,
  },
});