import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import { Race } from "../types";
import { COLORS } from "../lib/constants";

interface RankedCoin {
  address: string;
  symbol: string;
  name: string;
  logo?: string;
  percentChange: number;
}

export function ResultsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { raceId } = route.params as { raceId: string };

  const [race, setRace] = useState<Race | null>(null);
  const [rankedCoins, setRankedCoins] = useState<RankedCoin[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: raceData } = await supabase
        .from("races")
        .select("*")
        .eq("id", raceId)
        .single();

      if (!raceData) return;

      const raceObj: Race = {
        id: raceData.id,
        coins: raceData.coins,
        winningCoin: raceData.winning_coin,
        entryFee: raceData.entry_fee,
        raceDuration: raceData.race_duration,
        startTime: raceData.start_time,
        endTime: raceData.end_time,
        status: raceData.status,
        totalPot: raceData.total_pot,
        createdAt: raceData.created_at,
      };
      setRace(raceObj);

      // Fetch the last price snapshot for accurate % change
      const { data: priceData } = await supabase
        .from("race_prices")
        .select("prices")
        .eq("race_id", raceId)
        .order("recorded_at", { ascending: false })
        .limit(1);

      if (priceData && priceData.length > 0) {
        const prices = priceData[0].prices as any[];
        const ranked = raceObj.coins.map((coin) => {
          const priceEntry = prices.find(
            (p: any) => p.symbol === coin.symbol || p.address === coin.address
          );
          return {
            address: coin.address,
            symbol: coin.symbol,
            name: coin.name,
            logo: coin.logo,
            percentChange: priceEntry?.percentChange ?? 0,
          };
        });
        ranked.sort((a, b) => b.percentChange - a.percentChange);
        setRankedCoins(ranked);
      } else {
        // Fallback: use start/end price from coins
        const ranked = raceObj.coins.map((coin) => {
          const startPrice = coin.startPrice;
          const endPrice = coin.endPrice ?? coin.startPrice;
          const pct =
            startPrice > 0
              ? ((endPrice - startPrice) / startPrice) * 100
              : 0;
          return {
            address: coin.address,
            symbol: coin.symbol,
            name: coin.name,
            logo: coin.logo,
            percentChange: Math.round(pct * 100) / 100,
          };
        });
        ranked.sort((a, b) => b.percentChange - a.percentChange);
        setRankedCoins(ranked);
      }
    };

    fetchData();
  }, [raceId]);

  if (!race || rankedCoins.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading results...</Text>
      </View>
    );
  }

  const winner = rankedCoins[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Winner banner */}
      <View style={styles.winnerBanner}>
        <Text style={styles.crownEmoji}>👑</Text>
        <Text style={styles.winnerLabel}>WINNER</Text>
        <Text style={styles.winnerSymbol}>{winner.symbol}</Text>
        <Text style={styles.winnerName}>{winner.name}</Text>
        <Text
          style={[
            styles.winnerChange,
            { color: winner.percentChange >= 0 ? COLORS.primary : COLORS.danger },
          ]}
        >
          {winner.percentChange >= 0 ? "+" : ""}
          {winner.percentChange.toFixed(3)}%
        </Text>
      </View>

      {/* Full standings */}
      <View style={styles.standings}>
        <Text style={styles.sectionTitle}>FINAL STANDINGS</Text>
        {rankedCoins.map((coin, index) => {
          const isWinner = index === 0;
          const changeColor =
            coin.percentChange >= 0 ? COLORS.primary : COLORS.danger;

          return (
            <View
              key={coin.address}
              style={[styles.standingRow, isWinner && styles.winnerRow]}
            >
              <View style={styles.rankContainer}>
                <Text
                  style={[styles.rank, isWinner && { color: COLORS.gold }]}
                >
                  {isWinner ? "👑" : `#${index + 1}`}
                </Text>
              </View>

              <View style={styles.coinInfo}>
                {coin.logo ? (
                  <Image
                    source={{ uri: coin.logo }}
                    style={styles.coinLogo}
                  />
                ) : (
                  <View style={[styles.coinLogo, styles.coinLogoPlaceholder]}>
                    <Text style={styles.coinLogoText}>{coin.symbol[0]}</Text>
                  </View>
                )}
                <View>
                  <Text style={styles.coinSymbol}>{coin.symbol}</Text>
                  <Text style={styles.coinName} numberOfLines={1}>
                    {coin.name}
                  </Text>
                </View>
              </View>

              <Text style={[styles.percentChange, { color: changeColor }]}>
                {coin.percentChange >= 0 ? "+" : ""}
                {coin.percentChange.toFixed(3)}%
              </Text>
            </View>
          );
        })}
      </View>

      {/* Action button */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate("Lobby")}
        >
          <Text style={styles.primaryButtonText}>Back to Lobby</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 40,
  },
  loadingText: {
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 60,
    fontSize: 14,
  },
  winnerBanner: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    marginBottom: 16,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.gold,
  },
  crownEmoji: {
    fontSize: 48,
    marginBottom: 4,
  },
  winnerLabel: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 2,
    marginBottom: 4,
  },
  winnerSymbol: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: "900",
  },
  winnerName: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 8,
  },
  winnerChange: {
    fontSize: 22,
    fontWeight: "bold",
    fontVariant: ["tabular-nums"],
  },
  standings: {
    marginHorizontal: 16,
  },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 10,
  },
  standingRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  winnerRow: {
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  rankContainer: {
    width: 36,
    alignItems: "center",
  },
  rank: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "bold",
  },
  coinInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  coinLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  coinLogoPlaceholder: {
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  coinLogoText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "bold",
  },
  coinSymbol: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "bold",
  },
  coinName: {
    color: COLORS.textSecondary,
    fontSize: 11,
    maxWidth: 100,
  },
  percentChange: {
    fontSize: 14,
    fontWeight: "bold",
    fontVariant: ["tabular-nums"],
    marginRight: 8,
  },
  actions: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: "bold",
  },
});