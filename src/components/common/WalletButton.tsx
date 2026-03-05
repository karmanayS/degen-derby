import React from "react";
import { Text, StyleSheet, TouchableOpacity } from "react-native";
import { useAuthorization } from "../../utils/useAuthorization";
import { useMobileWallet } from "../../utils/useMobileWallet";
import { COLORS } from "../../lib/constants";

export function WalletButton() {
  const { selectedAccount } = useAuthorization();
  const { connect, disconnect } = useMobileWallet();

  const isConnected = !!selectedAccount;

  const handlePress = async () => {
    if (isConnected) {
      await disconnect();
    } else {
      await connect();
    }
  };

  const truncatedAddress = selectedAccount
    ? `${selectedAccount.publicKey.toBase58().slice(0, 4)}...${selectedAccount.publicKey.toBase58().slice(-4)}`
    : "";

  return (
    <TouchableOpacity
      style={[styles.button, isConnected && styles.connectedButton]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, isConnected && styles.connectedText]}>
        {isConnected ? truncatedAddress : "Connect Wallet"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  connectedButton: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  text: {
    color: COLORS.background,
    fontSize: 15,
    fontWeight: "bold",
  },
  connectedText: {
    color: COLORS.primary,
  },
});