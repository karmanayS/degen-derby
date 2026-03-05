import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { HorseTrack } from "../components/race/HorseTrack";
import { CountdownTimer } from "../components/race/CountdownTimer";
import { CoinPicker } from "../components/race/CoinPicker";
import { BetConfirmModal } from "../components/race/BetConfirmModal";
import { useRaceLive } from "../hooks/useRaceLive";
import { useBet } from "../hooks/useBet";
import { useAuthorization } from "../utils/useAuthorization";
import { calculateOdds } from "../lib/race-engine";
import { supabase } from "../lib/supabase";
import { Race, Bet } from "../types";
import { COLORS } from "../lib/constants";

export function RaceScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { raceId, race: initialRace } = route.params as {
    raceId: string;
    race: Race;
  };

  const [race, setRace] = useState<Race>(initialRace);
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);
  const [showBetModal, setShowBetModal] = useState(false);
  const [bets, setBets] = useState<Bet[]>([]);
  const [playerBet, setPlayerBet] = useState<Bet | null>(null);

  const { positions, latestPrices, isLive } = useRaceLive(
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

        // Check if player already bet
        if (selectedAccount) {
          const myBet = mapped.find(
            (b) =>
              b.walletAddress === selectedAccount.publicKey.toBase58()
          );
          if (myBet) setPlayerBet(myBet);
        }
      }
    };

    fetchBets();

    // Subscribe to new bets
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

          // Navigate to results when finished
          if (updated.status === "finished") {
            navigation.replace("Results", { raceId, race: updated });
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

  const handleConfirmBet = async () => {
    if (!selectedCoin) return;
    const success = await placeBet(raceId, selectedCoin, race.entryFee);
    if (success) {
      setShowBetModal(false);
      setPlayerBet({
        id: "",
        raceId,
        walletAddress: selectedAccount!.publicKey.toBase58(),
        pickedCoin: selectedCoin,
        amount: race.entryFee,
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
      <CountdownTimer endTime={race.endTime} status={race.status} />

      {/* Race track (show during live race or if finished) */}
      {(isRaceLive || race.status === "finished") && (
        <HorseTrack
          positions={positions}
          coins={race.coins}
          playerPick={playerBet?.pickedCoin}
        />
      )}

      {/* Betting info */}
      <View style={styles.raceInfo}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Entry Fee</Text>
          <Text style={styles.infoValue}>{race.entryFee} SOL</Text>
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
      </View>

      {/* Player's bet status */}
      {hasBet && (
        <View style={styles.betStatus}>
          <Text style={styles.betStatusText}>
            You bet on{" "}
            <Text style={{ color: COLORS.primary, fontWeight: "bold" }}>
              {playerBet.pickedCoin}
            </Text>
          </Text>
        </View>
      )}

      {/* Coin picker (only show if upcoming and no bet placed) */}
      {isUpcoming && !hasBet && (
        <>
          <CoinPicker
            coins={race.coins}
            selectedCoin={selectedCoin}
            odds={odds}
            onSelect={setSelectedCoin}
          />

          {selectedCoin && (
            <TouchableOpacity
              style={styles.betButton}
              onPress={() => setShowBetModal(true)}
            >
              <Text style={styles.betButtonText}>
                Place Bet — {race.entryFee} SOL
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* If race is live but player hasn't bet */}
      {isRaceLive && !hasBet && (
        <View style={styles.missedBet}>
          <Text style={styles.missedBetText}>
            Race in progress — watch the action!
          </Text>
        </View>
      )}

      {/* Bet confirmation modal */}
      <BetConfirmModal
        visible={showBetModal}
        coin={selectedCoinData ?? null}
        entryFee={race.entryFee}
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
  betButton: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  betButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: "bold",
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