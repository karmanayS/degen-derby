import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { HorseTrack } from "../components/race/HorseTrack";
import { CountdownTimer } from "../components/race/CountdownTimer";
import { BetConfirmModal } from "../components/race/BetConfirmModal";
import { useRaceLive } from "../hooks/useRaceLive";
import { useBet } from "../hooks/useBet";
import { useAuthorization } from "../utils/useAuthorization";
import { supabase } from "../lib/supabase";
import { calculateOdds } from "../lib/race-engine";
import { Race, Bet } from "../types";
import { COLORS, BET_LIMITS } from "../lib/constants";

const QUICK_AMOUNTS = [0.05, 0.1, 0.5, 1];

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
    parsedAmount >= BET_LIMITS.MIN && parsedAmount <= BET_LIMITS.MAX;

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
  const isRaceLive = race.status === "live";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Timer */}
      <CountdownTimer
        endTime={isUpcoming ? race.startTime : race.endTime}
        status={race.status}
      />

      {/* Status label */}
      <View style={styles.statusContainer}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: isRaceLive ? COLORS.primary : COLORS.warning },
          ]}
        >
          <Text style={styles.statusText}>
            {isUpcoming ? "PLACE YOUR BETS" : "RACE IN PROGRESS"}
          </Text>
        </View>
      </View>

      {/* Race track (show during live race) */}
      {isRaceLive && (
        <HorseTrack
          positions={positions}
          coins={race.coins}
          playerPick={playerBet?.pickedCoin}
        />
      )}

      {/* Player's bet status */}
      {hasBet && (
        <View style={styles.betStatus}>
          <Text style={styles.betStatusText}>
            You bet{" "}
            <Text style={{ color: COLORS.primary, fontWeight: "bold" }}>
              {playerBet.amount} SOL
            </Text>
            {" on "}
            <Text style={{ color: COLORS.primary, fontWeight: "bold" }}>
              {playerBet.pickedCoin}
            </Text>
          </Text>
        </View>
      )}

      {/* Token picker + bet amount — only during waiting period and if no bet placed */}
      {isUpcoming && !hasBet && (
        <View style={styles.pickerSection}>
          <Text style={styles.sectionTitle}>PICK YOUR HORSE</Text>
          {race.coins.map((coin) => {
            const isSelected = selectedCoin === coin.symbol;
            const coinOdds = odds[coin.symbol];

            return (
              <TouchableOpacity
                key={coin.address}
                style={[styles.coinRow, isSelected && styles.coinRowSelected]}
                onPress={() => setSelectedCoin(coin.symbol)}
                activeOpacity={0.7}
              >
                <View style={styles.coinLeft}>
                  {coin.logo ? (
                    <Image source={{ uri: coin.logo }} style={styles.coinLogo} />
                  ) : (
                    <View style={[styles.coinLogo, styles.coinLogoPlaceholder]}>
                      <Text style={styles.coinLogoText}>{coin.symbol[0]}</Text>
                    </View>
                  )}
                  <View>
                    <Text style={[styles.coinSymbol, isSelected && { color: COLORS.primary }]}>
                      {coin.symbol}
                    </Text>
                    <Text style={styles.coinName} numberOfLines={1}>
                      {coin.name}
                    </Text>
                  </View>
                </View>
                <View style={styles.coinRight}>
                  {coinOdds ? (
                    <Text style={styles.oddsText}>{coinOdds}x</Text>
                  ) : null}
                  <Text style={styles.coinPrice}>
                    ${coin.startPrice > 0 ? coin.startPrice.toFixed(6) : "\u2014"}
                  </Text>
                </View>
                {isSelected && <View style={styles.selectedDot} />}
              </TouchableOpacity>
            );
          })}

          {/* Bet amount selector */}
          {selectedCoin && (
            <View style={styles.betAmountSection}>
              <Text style={styles.sectionTitle}>BET AMOUNT (SOL)</Text>

              {/* Quick amount buttons */}
              <View style={styles.quickAmounts}>
                {QUICK_AMOUNTS.map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={[
                      styles.quickAmountBtn,
                      parsedAmount === amt && styles.quickAmountBtnActive,
                    ]}
                    onPress={() => setBetAmount(amt.toString())}
                  >
                    <Text
                      style={[
                        styles.quickAmountText,
                        parsedAmount === amt && styles.quickAmountTextActive,
                      ]}
                    >
                      {amt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom amount input */}
              <View style={styles.customAmountRow}>
                <TextInput
                  style={[
                    styles.amountInput,
                    !isValidBet && betAmount.length > 0 && styles.amountInputError,
                  ]}
                  value={betAmount}
                  onChangeText={setBetAmount}
                  keyboardType="decimal-pad"
                  placeholder={`${BET_LIMITS.MIN} - ${BET_LIMITS.MAX}`}
                  placeholderTextColor={COLORS.textMuted}
                />
                <Text style={styles.solLabel}>SOL</Text>
              </View>

              {!isValidBet && betAmount.length > 0 && (
                <Text style={styles.betError}>
                  Min {BET_LIMITS.MIN} SOL — Max {BET_LIMITS.MAX} SOL
                </Text>
              )}

              {/* Place bet button */}
              <TouchableOpacity
                style={[styles.betButton, !isValidBet && styles.betButtonDisabled]}
                onPress={() => setShowBetModal(true)}
                disabled={!isValidBet}
              >
                <Text style={styles.betButtonText}>
                  Place Bet — {isValidBet ? parsedAmount : "..."} SOL
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
          <Text style={styles.infoValue}>{BET_LIMITS.MAX} SOL</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Total Pot</Text>
          <Text style={[styles.infoValue, { color: COLORS.primary }]}>
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

      {/* If race is live but player hasn't bet */}
      {isRaceLive && !hasBet && (
        <View style={styles.missedBet}>
          <Text style={styles.missedBetText}>
            Betting closed — watch the race!
          </Text>
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
  statusContainer: {
    alignItems: "center",
    marginVertical: 12,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statusText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  betStatus: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  betStatusText: {
    color: COLORS.text,
    fontSize: 14,
  },
  pickerSection: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 10,
  },
  coinRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 2,
    borderColor: "transparent",
  },
  coinRowSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceLight,
  },
  coinLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  coinLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  coinLogoPlaceholder: {
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  coinLogoText: {
    color: COLORS.text,
    fontSize: 16,
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
    maxWidth: 150,
  },
  coinRight: {
    alignItems: "flex-end",
  },
  oddsText: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 2,
  },
  coinPrice: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },
  selectedDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  betAmountSection: {
    marginTop: 16,
  },
  quickAmounts: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  quickAmountBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  quickAmountBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceLight,
  },
  quickAmountText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  quickAmountTextActive: {
    color: COLORS.primary,
  },
  customAmountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  amountInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "bold",
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  amountInputError: {
    borderColor: COLORS.danger,
  },
  solLabel: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: "bold",
  },
  betError: {
    color: COLORS.danger,
    fontSize: 11,
    marginBottom: 6,
  },
  betButton: {
    backgroundColor: COLORS.primary,
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  betButtonDisabled: {
    opacity: 0.4,
  },
  betButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: "bold",
  },
  raceInfo: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  infoLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  infoValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
  },
  missedBet: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    alignItems: "center",
  },
  missedBetText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
});