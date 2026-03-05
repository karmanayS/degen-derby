import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { COLORS } from "../../lib/constants";

interface CountdownTimerProps {
  endTime: string;
  status: "upcoming" | "live" | "finished";
}

export function CountdownTimer({ endTime, status }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(0);
  const pulseOpacity = useSharedValue(1);

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

  // Pulse animation when under 30 seconds
  useEffect(() => {
    if (remaining <= 30 && remaining > 0 && status === "live") {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );
    } else {
      pulseOpacity.value = 1;
    }
  }, [remaining <= 30, status]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  const isUrgent = remaining <= 30 && status === "live";

  if (status === "finished") {
    return (
      <View style={styles.container}>
        <Text style={[styles.label, { color: COLORS.textSecondary }]}>
          RACE FINISHED
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {status === "upcoming" ? "STARTS IN" : "TIME LEFT"}
      </Text>
      <Animated.Text
        style={[
          styles.time,
          isUrgent && { color: COLORS.danger },
          pulseStyle,
        ]}
      >
        {timeStr}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 12,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 4,
  },
  time: {
    color: COLORS.text,
    fontSize: 36,
    fontWeight: "bold",
    fontVariant: ["tabular-nums"],
  },
});