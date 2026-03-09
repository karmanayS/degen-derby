import React from "react";
import { Text, StyleSheet, TouchableOpacity } from "react-native";
import { useAuthorization } from "../../utils/useAuthorization";
import { useMobileWallet } from "../../utils/useMobileWallet";
import { s, fs, vs } from "../../lib/responsive";

const C = {
  sand: "#C2A878",
  sandLight: "#D7C29E",
  danger: "#FF4444",
  surface: "#1A1A12",
  border: "#3A3A28",
};

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

  return (
    <TouchableOpacity
      style={[styles.button, isConnected && styles.connectedButton]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, isConnected && styles.connectedText]}>
        {isConnected ? "Disconnect Wallet" : "Connect Wallet"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: C.sand,
    paddingHorizontal: s(20),
    paddingVertical: vs(12),
    borderRadius: s(10),
    alignItems: "center",
  },
  connectedButton: {
    backgroundColor: C.danger + "10",
    borderWidth: 1,
    borderColor: C.danger + "99",
  },
  text: {
    color: "#0A1A0E",
    fontSize: fs(13),
    fontWeight: "700",
  },
  connectedText: {
    color: C.danger,
  },
});