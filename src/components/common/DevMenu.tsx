import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { getMultipleTokenPrices, getTrendingTokens } from "../../lib/dexscreener";
import { COLORS, FALLBACK_COINS } from "../../lib/constants";

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

export function DevMenu() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const createRace = async (durationSecs: number) => {
    setLoading(true);
    try {
      // Try trending first, fall back to curated list
      let coins = await getTrendingTokens();

      if (coins.length < 5) {
        const fallbackAddresses = FALLBACK_COINS.map((c) => c.address);
        const prices = await getMultipleTokenPrices(fallbackAddresses);
        coins = prices.map((p) => ({
          address: p.address,
          symbol: p.symbol,
          name: p.name,
          logo: p.logo,
        }));
      }

      if (coins.length < 5) {
        Alert.alert("Error", "Could not fetch enough coins");
        setLoading(false);
        return;
      }

      const selected = pickRandom(coins, 5);

      // Fetch current prices for start prices
      const prices = await getMultipleTokenPrices(
        selected.map((c) => c.address)
      );

      const raceCoins = selected.map((c) => {
        const priceData = prices.find((p) => p.address === c.address);
        return {
          address: c.address,
          name: c.name,
          symbol: c.symbol,
          logo: c.logo,
          startPrice: priceData?.price ?? 0,
          endPrice: null,
        };
      });

      // Start race in 30 seconds (shorter lobby for testing)
      const startTime = new Date(Date.now() + 30 * 1000);
      const endTime = new Date(startTime.getTime() + durationSecs * 1000);

      const { error } = await supabase.from("races").insert({
        coins: raceCoins,
        entry_fee: 0.05,
        race_duration: durationSecs,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: "upcoming",
        total_pot: 0,
        is_vip: false,
      });

      if (error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Race Created", `${durationSecs / 60}min race starts in 30s`);
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to create race");
    }
    setLoading(false);
  };

  const startRaceNow = async () => {
    setLoading(true);
    try {
      // Find the most recent upcoming race and set it to live now
      const { data } = await supabase
        .from("races")
        .select("id")
        .eq("status", "upcoming")
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        await supabase
          .from("races")
          .update({
            status: "live",
            start_time: new Date().toISOString(),
          })
          .eq("id", data[0].id);

        Alert.alert("Started", "Race is now live!");
      } else {
        Alert.alert("No Race", "No upcoming races to start");
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed");
    }
    setLoading(false);
  };

  if (!visible) {
    return (
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.toggleText}>DEV</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dev Menu</Text>
        <TouchableOpacity onPress={() => setVisible(false)}>
          <Text style={styles.close}>X</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator color={COLORS.primary} />}

      <TouchableOpacity
        style={styles.button}
        onPress={() => createRace(60)}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Create 1min Race</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => createRace(300)}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Create 5min Race</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => createRace(900)}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Create 15min Race</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: COLORS.warning }]}
        onPress={startRaceNow}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Start Upcoming Race NOW</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleButton: {
    position: "absolute",
    bottom: 90,
    right: 16,
    backgroundColor: COLORS.danger,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
    opacity: 0.8,
  },
  toggleText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: "bold",
  },
  container: {
    position: "absolute",
    bottom: 90,
    right: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    width: 220,
    zIndex: 999,
    borderWidth: 1,
    borderColor: COLORS.danger,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: "bold",
  },
  close: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: "bold",
    paddingHorizontal: 4,
  },
  button: {
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "600",
  },
});