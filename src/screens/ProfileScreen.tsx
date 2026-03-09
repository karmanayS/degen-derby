import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
  TextInput,
} from "react-native";
import Toast from "react-native-toast-message";
import * as Clipboard from "expo-clipboard";
import MaterialCommunityIcon from "@expo/vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import { WalletButton } from "../components/common/WalletButton";
import { useAuthorization } from "../utils/useAuthorization";
import { useSkrStatus } from "../hooks/useSkrStatus";
import { supabase } from "../lib/supabase";
import { LeaderboardEntry } from "../types";
import { s, fs, vs } from "../lib/responsive";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const grassTexture = require("../../assets/images/grass-turf.png");

const C = {
  green: "#00FF88",
  sand: "#C2A878",
  sandDark: "#A68A64",
  sandLight: "#D7C29E",
  cream: "#EDEDED",
  brownDark: "#16100A",
  muted: "#6D4C41",
  gold: "#F0D050",
  danger: "#FF4444",
};

interface BetHistoryItem {
  id: string;
  raceId: string;
  raceCoin: string;
  amount: number;
  payout: number | null;
  result: "won" | "lost" | "pending";
  date: string;
}

export function ProfileScreen() {
  const { selectedAccount } = useAuthorization();
  const { hasSkr } = useSkrStatus();
  const [stats, setStats] = useState<LeaderboardEntry | null>(null);
  const [username, setUsername] = useState<string>("");
  const [betHistory, setBetHistory] = useState<BetHistoryItem[]>([]);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editedUsername, setEditedUsername] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);

  const handleEditUsername = () => {
    setEditedUsername(username);
    setIsEditingUsername(true);
  };

  const handleSaveUsername = async () => {
    const trimmed = editedUsername.trim();
    if (trimmed.length < 3) {
      Toast.show({ type: "error", text1: "Error", text2: "Username must be at least 3 characters" });
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      Toast.show({ type: "error", text1: "Error", text2: "Only letters, numbers, and underscores allowed" });
      return;
    }
    if (trimmed === username) {
      setIsEditingUsername(false);
      return;
    }

    setSavingUsername(true);
    const { data: existing } = await supabase
      .from("users")
      .select("wallet_address")
      .eq("username", trimmed)
      .limit(1);

    if (existing && existing.length > 0) {
      Toast.show({ type: "error", text1: "Error", text2: "Username already taken" });
      setSavingUsername(false);
      return;
    }

    const { error } = await supabase
      .from("users")
      .update({ username: trimmed })
      .eq("wallet_address", walletAddress);

    if (error) {
      Toast.show({ type: "error", text1: "Error", text2: error.message });
    } else {
      setUsername(trimmed);
      setIsEditingUsername(false);
    }
    setSavingUsername(false);
  };

  const handleCopyAddress = async () => {
    if (walletAddress) {
      await Clipboard.setStringAsync(walletAddress);
      Toast.show({ type: "success", text1: "Copied", text2: "Wallet address copied to clipboard" });
    }
  };

  const walletAddress = selectedAccount?.publicKey.toBase58();

  useEffect(() => {
    if (!walletAddress) {
      setStats(null);
      setUsername("");
      setBetHistory([]);
      return;
    }

    const fetchProfile = async () => {
      // Fetch username
      const { data: userData } = await supabase
        .from("users")
        .select("username")
        .eq("wallet_address", walletAddress)
        .limit(1);

      if (userData && userData.length > 0) {
        setUsername(userData[0].username);
      }

      // Fetch stats
      const { data } = await supabase
        .from("leaderboard")
        .select("*")
        .eq("wallet_address", walletAddress)
        .single();

      if (data) {
        setStats({
          walletAddress: data.wallet_address,
          username: "",
          degenScore: data.degen_score,
          totalRaces: data.total_races,
          wins: data.wins,
          winStreak: data.win_streak,
          totalEarned: data.total_earned,
        });
      }

      // Fetch bet history
      const { data: betsData } = await supabase
        .from("bets")
        .select("id, race_id, picked_coin, amount, payout, created_at")
        .eq("wallet_address", walletAddress)
        .order("created_at", { ascending: false })
        .limit(10);

      if (betsData && betsData.length > 0) {
        setBetHistory(
          betsData.map((b: any) => {
            const payout = b.payout ?? 0;
            const result: "won" | "lost" | "pending" =
              b.payout === null ? "pending" : payout > 0 ? "won" : "lost";
            return {
              id: b.id,
              raceId: b.race_id,
              raceCoin: b.picked_coin,
              amount: b.amount,
              payout,
              result,
              date: formatRelativeDate(b.created_at),
            };
          })
        );
      }
    };

    fetchProfile();
  }, [walletAddress]);

  if (!selectedAccount) {
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
        <View style={styles.centered}>
          <Text style={styles.centeredTitle}>PROFILE</Text>
          <Text style={styles.centeredSubtitle}>Connect your wallet to view stats</Text>
          <WalletButton />
        </View>
      </View>
    );
  }

  const displayName = username || `${walletAddress!.slice(0, 4)}...${walletAddress!.slice(-4)}`;

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
        {/* User card */}
        <View style={styles.userCard}>
          {isEditingUsername ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.usernameInput}
                value={editedUsername}
                onChangeText={setEditedUsername}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                autoFocus
              />
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveUsername} disabled={savingUsername}>
                <Text style={styles.saveBtnText}>{savingUsername ? "..." : "Save"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelEditBtn} onPress={() => setIsEditingUsername(false)}>
                <Text style={styles.cancelEditText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={handleEditUsername} activeOpacity={0.7}>
              <Text style={styles.username}>{displayName}</Text>
              <Text style={styles.tapToEdit}>tap to edit</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.walletLabel}>WALLET</Text>
          <View style={styles.walletRow}>
            <Text style={styles.walletAddress}>
              {walletAddress!.slice(0, 8)}...{walletAddress!.slice(-8)}
            </Text>
            <TouchableOpacity onPress={handleCopyAddress} style={styles.copyBtn} activeOpacity={0.6}>
              <MaterialCommunityIcon name="content-copy" size={s(14)} color={C.sandLight} />
            </TouchableOpacity>
          </View>
          {hasSkr && (
            <View style={styles.skrBadge}>
              <Text style={styles.skrText}>SKR HOLDER</Text>
            </View>
          )}
          <View style={styles.walletActions}>
            <WalletButton />
          </View>
        </View>

        {/* Stats bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>RACES</Text>
            <Text style={styles.statValue}>{stats?.totalRaces ?? 0}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>WINS</Text>
            <Text style={[styles.statValue, { color: C.green }]}>{stats?.wins ?? 0}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>SOL EARNED</Text>
            <Text style={[styles.statValue, { color: C.green }]}>
              {stats?.totalEarned?.toFixed(2) ?? "0.00"}
            </Text>
          </View>
        </View>

        {/* Bet history */}
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>BET HISTORY</Text>
          {betHistory.length === 0 ? (
            <Text style={styles.emptyText}>No bet history</Text>
          ) : (
            betHistory.map((bet) => (
              <View key={bet.id} style={styles.betRow}>
                <View style={styles.betInfo}>
                  <Text style={styles.betRace}>Race #{bet.raceId.slice(0, 6)}</Text>
                  <Text style={styles.betCoin}>{bet.raceCoin} - {bet.amount} SOL</Text>
                </View>
                <View style={styles.betResult}>
                  <Text
                    style={[
                      styles.betResultText,
                      { color: bet.result === "won" ? C.green : bet.result === "lost" ? C.danger : C.muted },
                    ]}
                  >
                    {bet.result === "won"
                      ? `+${(bet.payout ?? 0).toFixed(2)} SOL`
                      : bet.result === "lost"
                        ? "LOST"
                        : "PENDING"}
                  </Text>
                  <Text style={styles.betDate}>{bet.date}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function formatRelativeDate(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
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
    padding: s(16),
    paddingBottom: vs(40),
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: s(16),
  },
  centeredTitle: {
    color: C.cream,
    fontSize: fs(22),
    fontWeight: "900",
    letterSpacing: 2,
  },
  centeredSubtitle: {
    color: C.muted,
    fontSize: fs(14),
  },
  userCard: {
    backgroundColor: C.sand + "18",
    borderRadius: s(10),
    padding: s(20),
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.sand + "33",
    marginBottom: vs(12),
  },
  username: {
    color: C.cream,
    fontSize: fs(40),
    fontWeight: "900",
    textAlign: "center",
  },
  tapToEdit: {
    color: "#FFFFFF",
    fontSize: fs(10),
    textAlign: "center",
    marginTop: vs(1),
    marginBottom: vs(12),
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(8),
    marginBottom: vs(12),
  },
  usernameInput: {
    flex: 1,
    backgroundColor: C.sand + "18",
    borderRadius: s(8),
    borderWidth: 1,
    borderColor: C.sand + "44",
    paddingHorizontal: s(12),
    paddingVertical: vs(8),
    color: C.cream,
    fontSize: fs(16),
    fontWeight: "700",
  },
  saveBtn: {
    backgroundColor: C.green + "22",
    borderWidth: 1,
    borderColor: C.green + "66",
    borderRadius: s(8),
    paddingHorizontal: s(14),
    paddingVertical: vs(8),
  },
  saveBtnText: {
    color: C.green,
    fontSize: fs(12),
    fontWeight: "800",
  },
  cancelEditBtn: {
    paddingHorizontal: s(10),
    paddingVertical: vs(8),
  },
  cancelEditText: {
    color: C.muted,
    fontSize: fs(12),
    fontWeight: "700",
  },
  walletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(6),
  },
  copyBtn: {
    padding: s(4),
  },
  walletLabel: {
    color: C.sandDark,
    fontSize: fs(9),
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: vs(4),
  },
  walletAddress: {
    color: C.sandLight,
    fontSize: fs(12),
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  skrBadge: {
    marginTop: vs(12),
    paddingHorizontal: s(14),
    paddingVertical: vs(5),
    borderRadius: s(8),
    backgroundColor: C.gold + "15",
    borderWidth: 1,
    borderColor: C.gold + "44",
  },
  skrText: {
    color: C.gold,
    fontSize: fs(9),
    fontWeight: "800",
    letterSpacing: 2,
  },
  walletActions: {
    marginTop: vs(12),
  },
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: vs(10),
    paddingHorizontal: s(12),
    backgroundColor: C.sand + "18",
    borderRadius: s(10),
    borderWidth: 1,
    borderColor: C.sand + "33",
    marginBottom: vs(12),
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: vs(24),
    backgroundColor: C.sand + "33",
    marginHorizontal: s(4),
  },
  statLabel: {
    color: C.sandDark,
    fontSize: fs(8),
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: vs(2),
  },
  statValue: {
    color: C.cream,
    fontSize: fs(16),
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  historySection: {
    marginBottom: vs(16),
  },
  historyTitle: {
    color: C.sand,
    fontSize: fs(10),
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: vs(8),
  },
  emptyText: {
    color: C.muted,
    fontSize: fs(13),
    textAlign: "center",
    paddingVertical: vs(20),
  },
  betRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: vs(10),
    paddingHorizontal: s(12),
    borderBottomWidth: 1,
    borderBottomColor: C.brownDark + "88",
  },
  betInfo: {
    flex: 1,
  },
  betRace: {
    color: C.sandLight,
    fontSize: fs(13),
    fontWeight: "700",
  },
  betCoin: {
    color: C.muted,
    fontSize: fs(10),
    marginTop: vs(2),
  },
  betResult: {
    alignItems: "flex-end",
  },
  betResultText: {
    fontSize: fs(13),
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  betDate: {
    color: C.muted,
    fontSize: fs(9),
    marginTop: vs(2),
  },
});