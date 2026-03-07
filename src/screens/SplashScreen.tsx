import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useMobileWallet } from "../utils/useMobileWallet";
import { supabase } from "../lib/supabase";
import { COLORS } from "../lib/constants";

export function SplashScreen() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { connect } = useMobileWallet();

  const isValidUsername = username.trim().length >= 3;

  const handleConnect = async () => {
    const trimmed = username.trim();

    if (trimmed.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setError("Only letters, numbers, and underscores allowed");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check if username is already taken
      const { data: existing } = await supabase
        .from("users")
        .select("wallet_address")
        .eq("username", trimmed)
        .limit(1);

      if (existing && existing.length > 0) {
        setError("Username already taken");
        setLoading(false);
        return;
      }

      // Connect wallet via MWA — returns the account
      const account = await connect();

      if (account) {
        const walletAddress = account.publicKey.toBase58();

        // Check if wallet already registered
        const { data: existingWallet } = await supabase
          .from("users")
          .select("username")
          .eq("wallet_address", walletAddress)
          .limit(1);

        if (!existingWallet || existingWallet.length === 0) {
          // Save new user before the screen unmounts
          const { error: insertError } = await supabase.from("users").insert({
            wallet_address: walletAddress,
            username: trimmed,
          });

          if (insertError) {
            if (insertError.message.includes("duplicate")) {
              setError("Username already taken");
            } else {
              setError(insertError.message);
            }
            setLoading(false);
            return;
          }
        }
      }

      setLoading(false);
    } catch (err: any) {
      setError(err?.message ?? "Connection failed");
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <Text style={styles.emoji}>🏇</Text>
        <Text style={styles.title}>DEGEN DERBY</Text>
        <Text style={styles.subtitle}>
          Bet on memecoins. Watch them race.
        </Text>
      </View>

      <View style={styles.bottom}>
        {/* Username input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>CHOOSE YOUR USERNAME</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              setError(null);
            }}
            placeholder="Enter username"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
            editable={!loading}
          />
        </View>

        {/* Error message */}
        {error && <Text style={styles.error}>{error}</Text>}

        {/* Connect button */}
        <TouchableOpacity
          style={[
            styles.connectButton,
            !isValidUsername && styles.connectButtonDisabled,
          ]}
          onPress={handleConnect}
          disabled={!isValidUsername || loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.background} size="small" />
          ) : (
            <Text style={styles.connectButtonText}>Connect Wallet</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>
          Enter a username, then connect your wallet
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "space-between",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    color: COLORS.text,
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: 3,
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: "center",
  },
  bottom: {
    alignItems: "center",
    gap: 12,
  },
  inputContainer: {
    width: "100%",
  },
  inputLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  error: {
    color: COLORS.danger,
    fontSize: 12,
  },
  connectButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    width: "100%",
  },
  connectButtonDisabled: {
    opacity: 0.4,
  },
  connectButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: "bold",
  },
  hint: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
});