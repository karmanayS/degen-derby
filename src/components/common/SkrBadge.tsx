import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../../lib/constants";
import { s, fs, vs } from "../../lib/responsive";

interface SkrBadgeProps {
  balance: number;
  compact?: boolean;
}

export function SkrBadge({ balance, compact }: SkrBadgeProps) {
  if (compact) {
    return (
      <View style={styles.compactBadge}>
        <Text style={styles.compactText}>SKR</Text>
      </View>
    );
  }

  return (
    <View style={styles.badge}>
      <Text style={styles.label}>SKR HOLDER</Text>
      <Text style={styles.balance}>
        {balance.toLocaleString()} SKR
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: s(8),
    paddingHorizontal: s(12),
    paddingVertical: vs(8),
    alignItems: "center",
  },
  label: {
    color: COLORS.gold,
    fontSize: fs(10),
    fontWeight: "bold",
    letterSpacing: 1,
  },
  balance: {
    color: COLORS.text,
    fontSize: fs(14),
    fontWeight: "600",
    marginTop: vs(2),
  },
  compactBadge: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: s(6),
    paddingVertical: vs(2),
    borderRadius: s(4),
  },
  compactText: {
    color: COLORS.background,
    fontSize: fs(9),
    fontWeight: "bold",
  },
});