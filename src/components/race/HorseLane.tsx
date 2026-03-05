import React, { useEffect } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { COLORS } from "../../lib/constants";

interface HorseLaneProps {
  symbol: string;
  name: string;
  logo: string;
  percentChange: number;
  trackPosition: number; // 0-85
  rank: number;
  isPlayerPick: boolean;
  totalHorses: number;
}

export function HorseLane({
  symbol,
  logo,
  percentChange,
  trackPosition,
  rank,
  isPlayerPick,
  totalHorses,
}: HorseLaneProps) {
  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    animatedWidth.value = withTiming(trackPosition, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [trackPosition]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%`,
  }));

  const isLeader = rank === 1;
  const changeColor =
    percentChange >= 0 ? COLORS.primary : COLORS.danger;

  return (
    <View
      style={[
        styles.lane,
        isPlayerPick && styles.playerPickLane,
      ]}
    >
      {/* Coin info on the left */}
      <View style={styles.coinInfo}>
        {logo ? (
          <Image source={{ uri: logo }} style={styles.coinLogo} />
        ) : (
          <View style={[styles.coinLogo, styles.coinLogoPlaceholder]}>
            <Text style={styles.coinLogoText}>{symbol[0]}</Text>
          </View>
        )}
        <Text style={styles.symbol} numberOfLines={1}>
          {symbol}
        </Text>
      </View>

      {/* Track */}
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.bar,
            barStyle,
            {
              backgroundColor: isLeader ? COLORS.primary : COLORS.surfaceLight,
            },
            isLeader && styles.leaderBar,
          ]}
        >
          {/* Horse icon at the front of the bar */}
          <View
            style={[
              styles.horseHead,
              {
                backgroundColor: isLeader ? COLORS.primary : COLORS.surfaceLight,
                borderColor: isLeader ? COLORS.primary : COLORS.textMuted,
              },
            ]}
          />
        </Animated.View>

        {/* Finish line */}
        <View style={styles.finishLine} />
      </View>

      {/* Percent change */}
      <Text style={[styles.percentChange, { color: changeColor }]}>
        {percentChange >= 0 ? "+" : ""}
        {percentChange.toFixed(2)}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  lane: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 3,
    backgroundColor: COLORS.surface,
  },
  playerPickLane: {
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  coinInfo: {
    width: 60,
    alignItems: "center",
    marginRight: 8,
  },
  coinLogo: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  coinLogoPlaceholder: {
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  coinLogoText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "bold",
  },
  symbol: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  track: {
    flex: 1,
    height: 24,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  bar: {
    height: "100%",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "flex-end",
    minWidth: 12,
  },
  leaderBar: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  horseHead: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    marginRight: -2,
  },
  finishLine: {
    position: "absolute",
    right: "8%",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: COLORS.textMuted,
    opacity: 0.4,
  },
  percentChange: {
    width: 65,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "bold",
    fontVariant: ["tabular-nums"],
  },
});