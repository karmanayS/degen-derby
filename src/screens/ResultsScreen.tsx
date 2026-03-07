import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ImageBackground,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../lib/supabase";
import { useAuthorization } from "../utils/useAuthorization";
import { Race } from "../types";

const C = {
  sand: "#C2A878",
  sandDark: "#A68A64",
  sandLight: "#D7C29E",
  cream: "#EDEDED",
  brownDark: "#16100A",
  muted: "#6D4C41",
  gold: "#F0D050",
  green: "#00FF88",
  danger: "#FF4444",
  surface: "#1A1A12",
  border: "#3A3A28",
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const grassTexture = require("../../assets/images/grass-turf.png");

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
  const { selectedAccount } = useAuthorization();

  const [race, setRace] = useState<Race | null>(null);
  const [rankedCoins, setRankedCoins] = useState<RankedCoin[]>([]);
  const [userPick, setUserPick] = useState<string | null>(null);
  const [userPayout, setUserPayout] = useState<number>(0);

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
        playerCount: 0,
        createdAt: raceData.created_at,
      };
      setRace(raceObj);

      // Fetch user's bet
      if (selectedAccount) {
        const wallet = selectedAccount.publicKey.toBase58();
        const { data: betData } = await supabase
          .from("bets")
          .select("picked_coin, payout")
          .eq("race_id", raceId)
          .eq("wallet_address", wallet)
          .limit(1);
        if (betData && betData.length > 0) {
          setUserPick(betData[0].picked_coin);
          setUserPayout(betData[0].payout ?? 0);
        }
      }

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
  }, [raceId, selectedAccount]);

  if (!race || rankedCoins.length === 0) {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.loadingText}>Loading results...</Text>
      </View>
    );
  }

  const winner = rankedCoins[0];
  const didWin = userPick === winner.symbol;

  return (
    <View style={styles.wrapper}>
      <ImageBackground
        source={grassTexture}
        style={StyleSheet.absoluteFillObject}
        imageStyle={{ resizeMode: "repeat" }}
      />
      <LinearGradient
        colors={["#0A1A0ECC", "#1B5E2055", "#0A0A0F99", "#2E1808CC", "#4A2E18DD", "#3A2010EE"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={["#00000000", "#00000000", "#1A100899", "#2E1F14AA"]}
        locations={[0, 0.5, 0.75, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Winner banner */}
        <View style={styles.winnerBanner}>
          <Text style={styles.trophyText}>1ST PLACE</Text>
          {winner.logo ? (
            <Image source={{ uri: winner.logo }} style={styles.winnerLogo} />
          ) : (
            <View style={[styles.winnerLogo, { justifyContent: "center", alignItems: "center" }]}>
              <Text style={{ color: C.gold, fontSize: 20, fontWeight: "900" }}>{winner.symbol[0]}</Text>
            </View>
          )}
          <Text style={styles.winnerName}>{winner.name}</Text>
          <Text style={styles.winnerChange}>
            {winner.percentChange >= 0 ? "+" : ""}{winner.percentChange.toFixed(2)}%
          </Text>
        </View>

        {/* User bet result */}
        {userPick && (
          <View style={[styles.resultBox, didWin ? styles.resultWin : styles.resultLose]}>
            <Text style={styles.resultLabel}>
              {didWin ? "WINNER" : "RESULT"}
            </Text>
            <Text style={styles.resultTitle}>
              {didWin ? "Congratulations!" : "Better luck next time"}
            </Text>
            {didWin ? (
              <Text style={styles.payoutText}>You won {userPayout.toFixed(2)} SOL</Text>
            ) : (
              <Text style={styles.pickText}>You picked {userPick}</Text>
            )}
          </View>
        )}

        {/* Final standings */}
        <Text style={styles.rankingsTitle}>FINAL STANDINGS</Text>

        {rankedCoins.map((coin, index) => {
          const isWinner = index === 0;
          const isUserPick = coin.symbol === userPick;
          const changeColor = coin.percentChange >= 0 ? C.green : C.danger;

          return (
            <View
              key={coin.address}
              style={[
                styles.rankRow,
                isWinner && styles.rankFirst,
                isUserPick && styles.rankUserPick,
              ]}
            >
              <Text style={[styles.rankNum, isWinner && { color: C.gold }]}>
                #{index + 1}
              </Text>
              {coin.logo ? (
                <Image source={{ uri: coin.logo }} style={styles.rankLogo} />
              ) : (
                <View style={[styles.rankLogo, { justifyContent: "center", alignItems: "center", backgroundColor: C.sand + "22" }]}>
                  <Text style={{ color: C.gold, fontSize: 10, fontWeight: "bold" }}>{coin.symbol[0]}</Text>
                </View>
              )}
              <View style={styles.rankInfo}>
                <Text style={styles.rankName}>{coin.name}</Text>
                <Text style={styles.rankSymbol}>{coin.symbol}</Text>
              </View>
              <Text style={[styles.rankChange, { color: changeColor }]}>
                {coin.percentChange >= 0 ? "+" : ""}
                {coin.percentChange.toFixed(2)}%
              </Text>
            </View>
          );
        })}

        {/* Back button */}
        <Pressable
          style={styles.nextBtn}
          onPress={() => navigation.navigate("Lobby")}
        >
          <Text style={styles.nextBtnText}>Back to Races</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#0A1A0E",
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  loadingText: {
    color: C.muted,
    textAlign: "center",
    marginTop: 60,
    fontSize: 14,
  },
  winnerBanner: {
    alignItems: "center",
    paddingVertical: 28,
    backgroundColor: C.sand + "18",
    borderBottomWidth: 1,
    borderBottomColor: C.sand + "33",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.sand + "33",
  },
  trophyText: {
    color: C.gold,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 3,
    marginBottom: 14,
  },
  winnerLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.sand + "22",
    borderWidth: 2,
    borderColor: C.gold,
    marginBottom: 10,
  },
  winnerName: {
    color: C.cream,
    fontSize: 22,
    fontWeight: "900",
  },
  winnerChange: {
    color: C.green,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 4,
  },
  resultBox: {
    margin: 16,
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  resultWin: {
    backgroundColor: C.green + "10",
    borderColor: C.green + "33",
  },
  resultLose: {
    backgroundColor: C.danger + "08",
    borderColor: C.danger + "22",
  },
  resultLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 3,
    color: C.sandDark,
    marginBottom: 4,
  },
  resultTitle: {
    color: C.cream,
    fontSize: 20,
    fontWeight: "900",
  },
  payoutText: {
    color: C.green,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 8,
    fontVariant: ["tabular-nums"],
  },
  pickText: {
    color: C.sandLight,
    fontSize: 14,
    marginTop: 8,
  },
  rankingsTitle: {
    color: C.sand,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginVertical: 2,
    backgroundColor: C.sand + "18",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.sand + "33",
  },
  rankFirst: {
    borderColor: C.gold + "44",
  },
  rankUserPick: {
    borderColor: C.green + "44",
  },
  rankNum: {
    color: C.muted,
    fontSize: 14,
    fontWeight: "900",
    width: 28,
  },
  rankLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.sand + "22",
    marginRight: 8,
  },
  rankInfo: {
    flex: 1,
  },
  rankName: {
    color: C.sandLight,
    fontSize: 13,
    fontWeight: "700",
  },
  rankSymbol: {
    color: C.muted,
    fontSize: 10,
  },
  rankChange: {
    fontSize: 14,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  nextBtn: {
    margin: 16,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: C.gold,
    alignItems: "center",
  },
  nextBtnText: {
    color: "#0A1A0E",
    fontSize: 15,
    fontWeight: "800",
  },
});