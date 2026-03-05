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
import { useAuthorization } from "../utils/useAuthorization";
import { supabase } from "../lib/supabase";
import { Race, Bet } from "../types";
import { COLORS } from "../lib/constants";

export function ResultsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { raceId } = route.params as { raceId: string };
  const { selectedAccount } = useAuthorization();

  const [race, setRace] = useState<Race | null>(null);
  const [playerBet, setPlayerBet] = useState<Bet | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch race
      const { data: raceData } = await supabase
        .from("races")
        .select("*")
        .eq("id", raceId)
        .single();

      if (raceData) {
        setRace({
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
        });
      }

      // Fetch player's bet
      if (selectedAccount) {
        const { data: betData } = await supabase
          .from("bets")
          .select("*")
          .eq("race_id", raceId)
          .eq("wallet_address", selectedAccount.publicKey.toBase58())
          .single();

        if (betData) {
          setPlayerBet({
            id: betData.id,
            raceId: betData.race_id,
            walletAddress: betData.wallet_address,
            pickedCoin: betData.picked_coin,
            amount: betData.amount,
            payout: betData.payout,
            txSignature: betData.tx_signature,
            createdAt: betData.created_at,
          });
        }
      }
    };

    fetchData();
  }, [raceId, selectedAccount]);

  if (!race) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading results...</Text>
      </View>
    );
  }

  // Sort coins by end price performance
  const rankedCoins = [...race.coins]
    .map((coin) => {
      const startPrice = coin.startPrice;
      const endPrice = coin.endPrice ?? coin.startPrice;
      const percentChange =
        startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0;
      return { ...coin, percentChange };
    })
    .sort((a, b) => b.percentChange - a.percentChange);

  const didWin =
    playerBet && playerBet.pickedCoin === race.winningCoin;
  const payout = playerBet?.payout ?? 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Result banner */}
      {playerBet ? (
        <View
          style={[
            styles.resultBanner,
            didWin ? styles.winBanner : styles.loseBanner,
          ]}
        >
          <Text style={styles.resultEmoji}>{didWin ? "🏆" : "😤"}</Text>
          <Text style={styles.resultTitle}>
            {didWin ? "YOU WON!" : "BETTER LUCK NEXT TIME"}
          </Text>
          {didWin && payout > 0 && (
            <Text style={styles.payoutText}>+{payout.toFixed(4)} SOL</Text>
          )}
        </View>
      ) : (
        <View style={styles.resultBanner}>
          <Text style={styles.resultTitle}>RACE RESULTS</Text>
        </View>
      )}

      {/* Standings */}
      <View style={styles.standings}>
        {rankedCoins.map((coin, index) => {
          const isWinner = index === 0;
          const isPlayerPick = playerBet?.pickedCoin === coin.symbol;
          const changeColor =
            coin.percentChange >= 0 ? COLORS.primary : COLORS.danger;

          return (
            <View
              key={coin.address}
              style={[
                styles.standingRow,
                isWinner && styles.winnerRow,
                isPlayerPick && styles.playerPickRow,
              ]}
            >
              {/* Rank */}
              <View style={styles.rankContainer}>
                <Text
                  style={[styles.rank, isWinner && { color: COLORS.gold }]}
                >
                  {isWinner ? "👑" : `#${index + 1}`}
                </Text>
              </View>

              {/* Coin */}
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

              {/* Percent change */}
              <Text style={[styles.percentChange, { color: changeColor }]}>
                {coin.percentChange >= 0 ? "+" : ""}
                {coin.percentChange.toFixed(2)}%
              </Text>

              {/* Player pick indicator */}
              {isPlayerPick && (
                <View style={styles.yourPick}>
                  <Text style={styles.yourPickText}>YOUR PICK</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Race stats */}
      <View style={styles.statsCard}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Pot</Text>
          <Text style={styles.statValue}>{race.totalPot.toFixed(2)} SOL</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Your Bet</Text>
          <Text style={styles.statValue}>
            {playerBet ? `${playerBet.amount} SOL on ${playerBet.pickedCoin}` : "None"}
          </Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate("Lobby")}
        >
          <Text style={styles.primaryButtonText}>Next Race</Text>
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
  resultBanner: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    marginBottom: 16,
  },
  winBanner: {
    borderBottomWidth: 3,
    borderBottomColor: COLORS.primary,
  },
  loseBanner: {
    borderBottomWidth: 3,
    borderBottomColor: COLORS.danger,
  },
  resultEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  resultTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
  },
  payoutText: {
    color: COLORS.primary,
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 8,
  },
  standings: {
    marginHorizontal: 16,
    gap: 6,
  },
  standingRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
  },
  winnerRow: {
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  playerPickRow: {
    borderWidth: 1,
    borderColor: COLORS.primary,
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
  yourPick: {
    position: "absolute",
    top: 4,
    right: 8,
  },
  yourPickText: {
    color: COLORS.primary,
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  statsCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 14,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
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