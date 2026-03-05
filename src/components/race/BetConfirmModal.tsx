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
import { COLORS } from "../../lib/constants";

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

  const potentialWin = odds ? (entryFee * odds).toFixed(3) : "—";

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>CONFIRM YOUR BET</Text>

          {/* Coin display */}
          <View style={styles.coinDisplay}>
            {coin.logo ? (
              <Image source={{ uri: coin.logo }} style={styles.coinLogo} />
            ) : (
              <View style={[styles.coinLogo, styles.coinLogoPlaceholder]}>
                <Text style={styles.coinLogoText}>{coin.symbol[0]}</Text>
              </View>
            )}
            <Text style={styles.coinSymbol}>{coin.symbol}</Text>
            <Text style={styles.coinName}>{coin.name}</Text>
          </View>

          {/* Bet details */}
          <View style={styles.details}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Entry Fee</Text>
              <Text style={styles.detailValue}>{entryFee} SOL</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Current Odds</Text>
              <Text style={[styles.detailValue, { color: COLORS.warning }]}>
                {odds ? `${odds}x` : "First bet!"}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Potential Win</Text>
              <Text style={[styles.detailValue, { color: COLORS.primary }]}>
                {potentialWin} SOL
              </Text>
            </View>
          </View>

          {/* Error */}
          {error && <Text style={styles.error}>{error}</Text>}

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmButton, loading && styles.disabledButton]}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.background} size="small" />
              ) : (
                <Text style={styles.confirmText}>Place Bet</Text>
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
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modal: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 340,
  },
  title: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 1,
    marginBottom: 20,
  },
  coinDisplay: {
    alignItems: "center",
    marginBottom: 20,
  },
  coinLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 8,
  },
  coinLogoPlaceholder: {
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  coinLogoText: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "bold",
  },
  coinSymbol: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "bold",
  },
  coinName: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  details: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  detailLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  detailValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
  },
  error: {
    color: COLORS.danger,
    fontSize: 12,
    textAlign: "center",
    marginBottom: 12,
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: "center",
  },
  cancelText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
  },
  confirmText: {
    color: COLORS.background,
    fontSize: 15,
    fontWeight: "bold",
  },
  disabledButton: {
    opacity: 0.6,
  },
});