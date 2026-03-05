import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../../lib/constants";

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
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  label: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  balance: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },
  compactBadge: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  compactText: {
    color: COLORS.background,
    fontSize: 9,
    fontWeight: "bold",
  },
});