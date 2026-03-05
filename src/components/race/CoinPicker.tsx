import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { Coin } from "../../types";
import { COLORS } from "../../lib/constants";

interface CoinPickerProps {
  coins: Coin[];
  selectedCoin: string | null; // symbol
  odds: Record<string, number>;
  onSelect: (symbol: string) => void;
}

export function CoinPicker({
  coins,
  selectedCoin,
  odds,
  onSelect,
}: CoinPickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>PICK YOUR HORSE</Text>
      <View style={styles.grid}>
        {coins.map((coin) => {
          const isSelected = selectedCoin === coin.symbol;
          const coinOdds = odds[coin.symbol];

          return (
            <TouchableOpacity
              key={coin.address}
              style={[styles.card, isSelected && styles.selectedCard]}
              onPress={() => onSelect(coin.symbol)}
              activeOpacity={0.7}
            >
              {/* Coin logo */}
              {coin.logo ? (
                <Image source={{ uri: coin.logo }} style={styles.logo} />
              ) : (
                <View style={[styles.logo, styles.logoPlaceholder]}>
                  <Text style={styles.logoText}>{coin.symbol[0]}</Text>
                </View>
              )}

              {/* Symbol */}
              <Text
                style={[styles.symbol, isSelected && styles.selectedText]}
                numberOfLines={1}
              >
                {coin.symbol}
              </Text>

              {/* Name */}
              <Text style={styles.name} numberOfLines={1}>
                {coin.name}
              </Text>

              {/* Odds */}
              {coinOdds ? (
                <View style={styles.oddsBadge}>
                  <Text style={styles.oddsText}>{coinOdds}x</Text>
                </View>
              ) : (
                <View style={styles.oddsBadge}>
                  <Text style={styles.oddsText}>--</Text>
                </View>
              )}

              {/* Selected indicator */}
              {isSelected && <View style={styles.checkmark} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  title: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textAlign: "center",
    marginBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    width: "30%",
    minWidth: 95,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedCard: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceLight,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 8,
  },
  logoPlaceholder: {
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "bold",
  },
  symbol: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 2,
  },
  selectedText: {
    color: COLORS.primary,
  },
  name: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginBottom: 8,
    maxWidth: 80,
    textAlign: "center",
  },
  oddsBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  oddsText: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: "bold",
  },
  checkmark: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
});