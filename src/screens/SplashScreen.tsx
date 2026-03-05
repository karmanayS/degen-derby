import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { WalletButton } from "../components/common/WalletButton";
import { COLORS } from "../lib/constants";

export function SplashScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo area */}
        <Text style={styles.emoji}>🏇</Text>
        <Text style={styles.title}>DEGEN DERBY</Text>
        <Text style={styles.subtitle}>
          Bet on memecoins. Watch them race.
        </Text>
      </View>

      <View style={styles.bottom}>
        <WalletButton />
        <Text style={styles.hint}>
          Connect your wallet to start racing
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "space-between",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    color: COLORS.text,
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: 3,
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: "center",
  },
  bottom: {
    alignItems: "center",
    gap: 12,
  },
  hint: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
});