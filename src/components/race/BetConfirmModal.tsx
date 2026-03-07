import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Image,
} from "react-native";
import { Coin } from "../../types";

const C = {
  sand: "#C2A878",
  sandLight: "#D7C29E",
  cream: "#EDEDED",
  surface: "#1A1A12",
  surfaceLight: "#2A2A1E",
  border: "#3A3A28",
  neonGreen: "#00FF88",
  gold: "#F0D050",
  danger: "#FF4444",
  muted: "#6D4C41",
};

interface BetConfirmModalProps {
  visible: boolean;
  coin: Coin | null;
  entryFee: number;
  odds: number | undefined;
  loading: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function BetConfirmModal({
  visible,
  coin,
  entryFee,
  odds,
  loading,
  error,
  onConfirm,
  onCancel,
}: BetConfirmModalProps) {
  if (!coin) return null;

  const potentialWin = odds ? (entryFee * odds).toFixed(3) : "\u2014";

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>PLACE YOUR BET</Text>

          <View style={styles.coinRow}>
            {coin.logo ? (
              <Image source={{ uri: coin.logo }} style={styles.logo} />
            ) : (
              <View style={[styles.logo, styles.logoPlaceholder]}>
                <Text style={{ color: C.gold, fontSize: 18, fontWeight: "bold" }}>{coin.symbol[0]}</Text>
              </View>
            )}
            <View>
              <Text style={styles.coinName}>{coin.name}</Text>
              <Text style={styles.coinSymbol}>{coin.symbol}</Text>
            </View>
          </View>

          <View style={styles.feeContainer}>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Entry Fee</Text>
              <Text style={styles.feeValue}>{entryFee} SOL</Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Current Odds</Text>
              <Text style={[styles.feeValue, { color: C.gold }]}>
                {odds ? `${odds}x` : "First bet!"}
              </Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Potential Return</Text>
              <Text style={[styles.feeValue, { color: C.neonGreen }]}>
                {potentialWin} SOL
              </Text>
            </View>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={loading}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, loading && styles.confirmBtnDisabled]}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#0A0A0F" size="small" />
              ) : (
                <Text style={styles.confirmText}>Confirm</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modal: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    borderWidth: 1,
    borderColor: C.border,
  },
  title: {
    color: C.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 20,
  },
  coinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
    padding: 12,
    backgroundColor: C.surfaceLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0A0A0F",
  },
  logoPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  coinName: {
    color: C.cream,
    fontSize: 16,
    fontWeight: "800",
  },
  coinSymbol: {
    color: C.sandLight,
    fontSize: 12,
  },
  feeContainer: {
    backgroundColor: C.surfaceLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  feeLabel: {
    color: C.sandLight,
    fontSize: 13,
  },
  feeValue: {
    color: C.neonGreen,
    fontSize: 15,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  error: {
    color: C.danger,
    fontSize: 12,
    textAlign: "center",
    marginBottom: 12,
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
  },
  cancelText: {
    color: C.sandLight,
    fontSize: 14,
    fontWeight: "700",
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.neonGreen,
    alignItems: "center",
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    color: "#0A0A0F",
    fontSize: 14,
    fontWeight: "800",
  },
});