import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { s, fs, vs } from "../../lib/responsive";

const T = {
  sandLight: "#D7C29E",
  sand: "#C2A878",
  muted: "#6D4C41",
  danger: "#FF4444",
  surface: "#1A1A12",
  border: "#3A3A28",
};

interface CountdownTimerProps {
  endTime: string;
  status: "upcoming" | "live" | "finished";
  compact?: boolean;
  color?: string;
  textColor?: string;
}

export function CountdownTimer({ endTime, status, compact, color, textColor }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    const update = () => {
      const diff = Math.max(
        0,
        Math.floor((new Date(endTime).getTime() - Date.now()) / 1000)
      );
      setRemaining(diff);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  const isUrgent = remaining < 30 && remaining > 0;

  useEffect(() => {
    if (!isUrgent) {
      pulse.value = withTiming(1, { duration: 180 });
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 420, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 420, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
  }, [isUrgent, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  if (status === "finished") {
    return (
      <View style={styles.container}>
        <Text style={[styles.label, { color: T.muted }]}>FINISHED</Text>
      </View>
    );
  }

  const digitColor = textColor || color || (isUrgent ? T.danger : T.sandLight);
  const boxBorderColor = color ? color + "66" : isUrgent ? T.danger + "44" : T.sand + "66";
  const boxBgColor = isUrgent ? T.danger + "22" : "transparent";

  return (
    <Animated.View style={[styles.container, pulseStyle]}>
      <View style={styles.timerRow}>
        <View style={[
          styles.digitBox,
          compact && styles.digitBoxCompact,
          { borderColor: boxBorderColor, backgroundColor: boxBgColor },
        ]}>
          <Text style={[
            styles.digit,
            compact && styles.digitCompact,
            { color: digitColor },
          ]}>
            {String(mins).padStart(2, "0")}
          </Text>
        </View>
        <Text style={[
          styles.colon,
          compact && styles.colonCompact,
          { color: digitColor },
        ]}>:</Text>
        <View style={[
          styles.digitBox,
          compact && styles.digitBoxCompact,
          { borderColor: boxBorderColor, backgroundColor: boxBgColor },
        ]}>
          <Text style={[
            styles.digit,
            compact && styles.digitCompact,
            { color: digitColor },
          ]}>
            {String(secs).padStart(2, "0")}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  label: {
    fontSize: fs(9),
    fontWeight: "800",
    letterSpacing: 1,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  digitBox: {
    borderRadius: s(8),
    paddingHorizontal: s(14),
    paddingVertical: vs(7),
    borderWidth: 1,
    borderColor: T.sand + "66",
  },
  digit: {
    color: T.sandLight,
    fontSize: fs(30),
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    letterSpacing: 2,
  },
  colon: {
    color: T.muted,
    fontSize: fs(24),
    fontWeight: "900",
    marginHorizontal: s(4),
  },
  digitBoxCompact: {
    paddingHorizontal: s(8),
    paddingVertical: vs(4),
    borderRadius: s(6),
  },
  digitCompact: {
    fontSize: fs(14),
    letterSpacing: 1,
  },
  colonCompact: {
    fontSize: fs(12),
    marginHorizontal: s(2),
  },
});