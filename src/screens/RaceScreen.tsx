import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ImageBackground,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { HorseTrack } from "../components/race/HorseTrack";
import { CountdownTimer } from "../components/race/CountdownTimer";
import { BetConfirmModal } from "../components/race/BetConfirmModal";
import { useRaceLive } from "../hooks/useRaceLive";
import { useBet } from "../hooks/useBet";
import { useAuthorization } from "../utils/useAuthorization";
import { supabase } from "../lib/supabase";
import { calculateOdds } from "../lib/race-engine";
import { Race, Bet } from "../types";
import { BET_LIMITS } from "../lib/constants";
import { useSkrStatus } from "../hooks/useSkrStatus";

const C = {
  green: "#2E7D32",
  greenDark: "#1B5E20",
  sand: "#C2A878",
  sandDark: "#A68A64",
  sandLight: "#D7C29E",
  cream: "#EDEDED",
  warmBrown: "#6D4C41",
  warmBrownDark: "#4E342E",
  surface: "#1A1A12",
  surfaceLight: "#2A2A1E",
  border: "#3A3A28",
  neonGreen: "#00FF88",
  danger: "#FF4444",
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const grassTexture = require("../../assets/images/grass-turf.png");

export function RaceScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { raceId, race: initialRace } = route.params as {
    raceId: string;
    race: Race;
  };

  const [race, setRace] = useState<Race>(initialRace);
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState("0.05");
  const [showBetModal, setShowBetModal] = useState(false);
  const [bets, setBets] = useState<Bet[]>([]);
  const [playerBet, setPlayerBet] = useState<Bet | null>(null);
  const [walletUsernames, setWalletUsernames] = useState<Record<string, string>>({});
  const { hasSkr } = useSkrStatus();
  const maxBet = hasSkr ? BET_LIMITS.SKR_MAX : BET_LIMITS.MAX;

  const { positions } = useRaceLive(
    race.status === "live" ? raceId : null
  );
  const { placeBet, loading: betLoading, error: betError } = useBet();
  const { selectedAccount } = useAuthorization();

  // Fetch bets for this race
  useEffect(() => {
    const fetchBets = async () => {
      const { data } = await supabase
        .from("bets")
        .select("*")
        .eq("race_id", raceId);

      if (data) {
        const mapped = data.map((row: any) => ({
          id: row.id,
          raceId: row.race_id,
          walletAddress: row.wallet_address,
          pickedCoin: row.picked_coin,
          amount: row.amount,
          payout: row.payout,
          txSignature: row.tx_signature,
          createdAt: row.created_at,
        }));
        setBets(mapped);

        // Fetch usernames for all wallets
        const wallets = [...new Set(mapped.map((b) => b.walletAddress))];
        if (wallets.length > 0) {
          const { data: users } = await supabase
            .from("users")
            .select("wallet_address, username")
            .in("wallet_address", wallets);
          if (users) {
            const map: Record<string, string> = {};
            for (const u of users) {
              map[u.wallet_address] = u.username;
            }
            setWalletUsernames(map);
          }
        }

        if (selectedAccount) {
          const myBet = mapped.find(
            (b) => b.walletAddress === selectedAccount.publicKey.toBase58()
          );
          if (myBet) setPlayerBet(myBet);
        }
      }
    };

    fetchBets();

    const channel = supabase
      .channel(`bets-${raceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bets",
          filter: `race_id=eq.${raceId}`,
        },
        () => fetchBets()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [raceId, selectedAccount]);

  // Subscribe to race status changes
  useEffect(() => {
    const channel = supabase
      .channel(`race-status-${raceId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "races",
          filter: `id=eq.${raceId}`,
        },
        (payload: any) => {
          const updated = payload.new;
          setRace({
            id: updated.id,
            coins: updated.coins,
            winningCoin: updated.winning_coin,
            entryFee: updated.entry_fee,
            raceDuration: updated.race_duration,
            startTime: updated.start_time,
            endTime: updated.end_time,
            status: updated.status,
            totalPot: updated.total_pot,
            playerCount: 0,
            createdAt: updated.created_at,
          });

          if (updated.status === "finished") {
            navigation.replace("Results", { raceId });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [raceId]);

  const odds = calculateOdds(
    bets.map((b) => ({ pickedCoin: b.pickedCoin, amount: b.amount }))
  );

  const parsedAmount = parseFloat(betAmount) || 0;
  const isValidBet =
    parsedAmount >= BET_LIMITS.MIN && parsedAmount <= maxBet;

  const handleConfirmBet = async () => {
    if (!selectedCoin || !isValidBet) return;
    const success = await placeBet(raceId, selectedCoin, parsedAmount);
    if (success) {
      setShowBetModal(false);
      setPlayerBet({
        id: "",
        raceId,
        walletAddress: selectedAccount!.publicKey.toBase58(),
        pickedCoin: selectedCoin,
        amount: parsedAmount,
        createdAt: new Date().toISOString(),
      });
    }
  };

  const selectedCoinData = race.coins.find((c) => c.symbol === selectedCoin);
  const hasBet = !!playerBet;
  const isUpcoming = race.status === "upcoming";
  const isLive = race.status === "live";
  const isFinished = race.status === "finished";

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
        {/* Top status bar */}
        <View style={[
          styles.topBar,
          isLive && styles.topBarLive,
          isFinished && styles.topBarFinished,
        ]}>
          {isUpcoming && (
            <View style={styles.topBarItem}>
              <Text style={[styles.topBarLabel, { color: C.neonGreen }]}>TIME LEFT TO PLACE BET</Text>
              <CountdownTimer endTime={race.startTime} status={race.status} compact color={C.neonGreen} textColor="#FFFFFF" />
            </View>
          )}
          {isLive && (
            <View style={styles.topBarItem}>
              <View style={styles.liveRow}>
                <View style={styles.liveDot} />
                <Text style={styles.topBarLabelLive}>LIVE</Text>
              </View>
              <CountdownTimer endTime={race.endTime} status={race.status} compact color={C.neonGreen} textColor="#FFFFFF" />
            </View>
          )}
          {isFinished && (
            <View style={styles.topBarItem}>
              <Text style={styles.topBarLabelFinished}>FINISHED</Text>
            </View>
          )}
          <View style={styles.topBarDivider} />
          <View style={styles.topBarItemSmall}>
            <Text style={styles.topBarStatLabel}>POT</Text>
            <Text style={styles.topBarStatValue}>{race.totalPot} SOL</Text>
          </View>
          <View style={styles.topBarDivider} />
          <View style={styles.topBarItemSmall}>
            <Text style={styles.topBarStatLabel}>RIDERS</Text>
            <Text style={styles.topBarStatValue}>{bets.length}</Text>
          </View>
        </View>

        {/* "Pick your horse" prompt */}
        {isUpcoming && !hasBet && (
          <View style={styles.pickHorseRow}>
            <Text style={styles.pickHorseText}>Pick your horse</Text>
            <Text style={styles.pickHorseArrow}>{"\u2193"}</Text>
          </View>
        )}

        {/* Horse track — always visible, selectable during upcoming */}
        <HorseTrack
          positions={positions}
          coins={race.coins}
          playerPick={playerBet?.pickedCoin}
          selectable={isUpcoming && !hasBet}
          selectedCoin={selectedCoin}
          onCoinSelect={(symbol) => setSelectedCoin(symbol)}
        />

        {/* Player's bet status */}
        {hasBet && (
          <View style={styles.betStatus}>
            <Text style={styles.betStatusText}>
              You bet{" "}
              <Text style={{ color: C.neonGreen, fontWeight: "800" }}>
                {playerBet.amount} SOL
              </Text>
              {" on "}
              <Text style={{ color: C.neonGreen, fontWeight: "800" }}>
                {playerBet.pickedCoin}
              </Text>
            </Text>
          </View>
        )}

        {/* Betting UI — inline row during upcoming, closed message during live */}
        {isUpcoming && !hasBet && selectedCoin && (
          <View style={styles.betInputRow}>
            <TextInput
              style={styles.betInput}
              placeholder="Amount (SOL)"
              placeholderTextColor={C.sand}
              keyboardType="decimal-pad"
              value={betAmount}
              onChangeText={setBetAmount}
            />
            <Pressable
              style={[styles.placeBetBtn, (!isValidBet) && styles.placeBetBtnDisabled]}
              onPress={() => setShowBetModal(true)}
              disabled={!isValidBet}
            >
              <Text style={[styles.placeBetBtnText, (!isValidBet) && styles.placeBetBtnTextDisabled]}>
                Place Bet
              </Text>
            </Pressable>
          </View>
        )}

        {isLive && !hasBet && (
          <View style={styles.bettingClosed}>
            <Text style={styles.bettingClosedText}>Betting closed! The race has started.</Text>
          </View>
        )}

        {/* Race info */}
        <View style={styles.raceInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Min Bet</Text>
            <Text style={styles.infoValue}>{BET_LIMITS.MIN} SOL</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Max Bet</Text>
            <Text style={styles.infoValue}>{maxBet} SOL</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Pot</Text>
            <Text style={[styles.infoValue, { color: C.neonGreen }]}>
              {race.totalPot.toFixed(2)} SOL
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Players</Text>
            <Text style={styles.infoValue}>{bets.length}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Duration</Text>
            <Text style={styles.infoValue}>{Math.floor(race.raceDuration / 60)}m</Text>
          </View>
        </View>

        {/* Players list */}
        {bets.length > 0 && (
          <View style={styles.playersSection}>
            <Text style={styles.playersSectionTitle}>PLAYERS</Text>
            {bets.map((bet, i) => {
              const username = walletUsernames[bet.walletAddress];
              const truncatedWallet = `${bet.walletAddress.slice(0, 4)}...${bet.walletAddress.slice(-3)}`;
              return (
                <View key={bet.id || i} style={styles.playerRow}>
                  <Text style={styles.playerUsername}>{username || truncatedWallet}</Text>
                  <Text style={styles.playerWallet}>{truncatedWallet}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Bet confirmation modal */}
        <BetConfirmModal
          visible={showBetModal}
          coin={selectedCoinData ?? null}
          entryFee={parsedAmount}
          odds={odds[selectedCoin ?? ""]}
          loading={betLoading}
          error={betError}
          onConfirm={handleConfirmBet}
          onCancel={() => setShowBetModal(false)}
        />
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: C.sand + "18",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.sand + "33",
    marginBottom: 8,
  },
  topBarLive: {
    backgroundColor: C.green + "22",
    borderColor: C.green + "44",
  },
  topBarFinished: {
    backgroundColor: C.surface,
    borderColor: C.border,
  },
  topBarItem: {
    flex: 2.5,
    alignItems: "center",
  },
  topBarItemSmall: {
    flex: 1,
    alignItems: "center",
  },
  topBarLabel: {
    color: C.sand,
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  topBarLabelLive: {
    color: C.neonGreen,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  topBarLabelFinished: {
    color: C.sandDark,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.neonGreen,
  },
  topBarStatLabel: {
    color: C.sandDark,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 2,
  },
  topBarStatValue: {
    color: C.cream,
    fontSize: 14,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  topBarDivider: {
    width: 1,
    height: 24,
    backgroundColor: C.sand + "33",
    marginHorizontal: 4,
  },
  pickHorseRow: {
    alignItems: "center",
    marginTop: 6,
    marginBottom: 2,
  },
  pickHorseText: {
    color: C.sand,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
  },
  pickHorseArrow: {
    color: C.sand,
    fontSize: 16,
    marginTop: 2,
  },
  betStatus: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: C.neonGreen + "18",
    borderWidth: 1,
    borderColor: C.neonGreen + "33",
    alignItems: "center",
  },
  betStatusText: {
    color: C.cream,
    fontSize: 14,
    fontWeight: "600",
  },
  betInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    gap: 10,
  },
  betInput: {
    flex: 0.55,
    backgroundColor: C.surface + "CC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.cream,
    fontSize: 14,
    fontWeight: "600",
  },
  placeBetBtn: {
    flex: 0.45,
    backgroundColor: "#C8B000",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
    shadowColor: "#FFFF00",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#FFFFFF33",
  },
  placeBetBtnDisabled: {
    backgroundColor: "#FFFF0066",
  },
  placeBetBtnText: {
    color: "#FFFFFFDD",
    fontSize: 14,
    fontWeight: "800",
    textShadowColor: "#FFFFFFAA",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  placeBetBtnTextDisabled: {
    color: "#FFFFFFAA",
  },
  bettingClosed: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: C.sand + "18",
    borderWidth: 1,
    borderColor: C.sand + "33",
    alignItems: "center",
  },
  bettingClosedText: {
    color: C.sandLight,
    fontSize: 13,
    fontWeight: "700",
  },
  raceInfo: {
    backgroundColor: C.surface + "CC",
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginTop: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.border + "55",
  },
  infoLabel: {
    color: C.sandDark,
    fontSize: 13,
    fontWeight: "600",
  },
  infoValue: {
    color: C.cream,
    fontSize: 13,
    fontWeight: "700",
  },
  playersSection: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: C.surface + "CC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },
  playersSectionTitle: {
    color: C.sandDark,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 10,
  },
  playerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border + "55",
  },
  playerUsername: {
    color: C.cream,
    fontSize: 13,
    fontWeight: "700",
  },
  playerWallet: {
    color: C.sandLight + "AA",
    fontSize: 12,
    fontFamily: "monospace",
  },
});