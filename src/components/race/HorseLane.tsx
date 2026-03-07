import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Image, LayoutChangeEvent, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";

const T = {
  brownDark: "#16100A",
  brownWood: "#3A2818",
  brownGrain: "#2A1C12",
  sand: "#C2A878",
  sandLight: "#D7C29E",
  muted: "#6D4C41",
  cream: "#EDEDED",
  gold: "#F0D050",
  green: "#00FF88",
  danger: "#FF4444",
};

interface HorseLaneProps {
  symbol: string;
  name: string;
  logo: string;
  percentChange: number;
  trackPosition: number; // 0-85
  rank: number;
  isPlayerPick: boolean;
  totalHorses: number;
  laneIndex: number;
  selectable?: boolean;
  isSelected?: boolean;
  onSelect?: (symbol: string) => void;
}

const ICON_SIZE = 24;

export function HorseLane({
  symbol,
  name,
  logo,
  percentChange,
  trackPosition,
  rank,
  isPlayerPick,
  laneIndex,
  selectable,
  isSelected,
  onSelect,
}: HorseLaneProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const position = useSharedValue(0);

  const normalizedProgress = useMemo(() => {
    return Math.max(0, Math.min(1, trackPosition / 85));
  }, [trackPosition]);

  useEffect(() => {
    if (!trackWidth) return;
    const usable = Math.max(trackWidth - ICON_SIZE, 0);
    const target = usable * normalizedProgress;
    position.value = withTiming(target, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [normalizedProgress, position, trackWidth]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: position.value }],
  }));

  const onTrackLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const changeColor = percentChange >= 0 ? "#4CAF50" : T.danger;
  const displayName = name.length > 8 ? symbol : name;
  const isLeader = rank === 1;

  const Wrapper = selectable ? Pressable : View;
  const wrapperProps = selectable ? { onPress: () => onSelect?.(symbol) } : {};

  return (
    <Wrapper {...wrapperProps} style={[styles.laneWrapper, isSelected && styles.laneSelected]}>
      <View style={styles.laneInfo}>
        <Text style={[styles.laneNum, isLeader && styles.leaderNum]}>{laneIndex + 1}</Text>
        <Text style={styles.coinName} numberOfLines={1}>{displayName}</Text>
      </View>

      <View style={styles.trackArea} onLayout={onTrackLayout}>
        <View style={styles.trackLine} />
        <Animated.View style={[styles.iconWrap, animatedStyle]}>
          {logo ? (
            <Image
              source={{ uri: logo }}
              style={[
                styles.coinIcon,
                isLeader && styles.leaderIcon,
                isSelected && styles.selectedIcon,
                isPlayerPick && styles.playerPickIcon,
              ]}
            />
          ) : (
            <View style={[styles.coinIcon, styles.coinIconPlaceholder, isLeader && styles.leaderIcon, isSelected && styles.selectedIcon]}>
              <Text style={{ color: T.gold, fontSize: 10, fontWeight: "bold" }}>{symbol[0]}</Text>
            </View>
          )}
        </Animated.View>
      </View>

      <Text style={[styles.percent, { color: changeColor }]}>
        {percentChange >= 0 ? "+" : ""}{percentChange.toFixed(2)}%
      </Text>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  laneWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: T.brownDark + "88",
  },
  laneSelected: {
    backgroundColor: "#00FF8812",
  },
  laneInfo: {
    flexDirection: "row",
    alignItems: "center",
    width: 72,
  },
  laneNum: {
    color: T.muted,
    fontSize: 15,
    fontWeight: "900",
    width: 20,
    textAlign: "center",
  },
  leaderNum: {
    color: T.gold,
  },
  coinName: {
    color: T.sandLight,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 4,
  },
  trackArea: {
    flex: 1,
    height: ICON_SIZE + 8,
    justifyContent: "center",
  },
  trackLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#6B5530",
    borderRadius: 1,
  },
  iconWrap: {
    position: "absolute",
    top: 4,
    left: 0,
  },
  coinIcon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    backgroundColor: T.brownGrain,
    borderWidth: 1.5,
    borderColor: T.brownWood,
  },
  coinIconPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  selectedIcon: {
    borderColor: "#00FF88",
    borderWidth: 2.5,
    shadowColor: "#00FF88",
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  playerPickIcon: {
    borderColor: T.gold,
    borderWidth: 2,
    shadowColor: T.gold,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  leaderIcon: {
    borderColor: "#FFD700",
    borderWidth: 2.5,
    shadowColor: "#FFD700",
    shadowOpacity: 1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    elevation: 24,
  },
  percent: {
    fontSize: 11,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    width: 60,
    textAlign: "right",
    marginLeft: 6,
  },
});