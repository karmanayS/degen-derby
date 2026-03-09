import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  Image,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useMobileWallet } from "../utils/useMobileWallet";
import { supabase } from "../lib/supabase";
import { COLORS } from "../lib/constants";

const grassTexture = require("../../assets/images/grass-turf.png");

const { width: SCREEN_W } = Dimensions.get("window");

// Memecoin logos for the arc display
const MEME_COINS = [
  { symbol: "BONK", logo: "https://cdn.dexscreener.com/cms/images/ba03c0370670d176dc33bbd212eb023337a460ad7edfa053ca96ae22f31c3dcf?width=800&height=800&quality=90" },
  { symbol: "WIF", logo: "https://cdn.dexscreener.com/cms/images/c3788335fe7010d9c32ede4f211118f4a703e0b47fee61cd503c33cc9cde242a?width=800&height=800&quality=90" },
  { symbol: "POPCAT", logo: "https://cdn.dexscreener.com/cms/images/b81e914266494074d233b1b88a8983d7e724951f67d82baebbeb943efe1f5da2?width=800&height=800&quality=90" },
  { symbol: "PEPE", logo: "https://cdn.dexscreener.com/cms/images/ae001139fa1fcd24f8421d82caf72d8e06fabafab33b089c5d2e6d18039354e7?width=800&height=800&quality=90" },
  { symbol: "DOGE", logo: "https://cdn.dexscreener.com/cms/images/442856950e0454d8dc32d50a406ef2e7cc5a86f8d88d4b5366a2aedf9494916e?width=800&height=800&quality=90" },
  { symbol: "BOME", logo: "https://cdn.dexscreener.com/cms/images/1fdb1c93b76e5aed7324c2c541558fd75fe7ffb3d0d0fb9ee8370cbac5890e4e?width=800&height=800&quality=90" },
];

// Arc positioning for floating coin logos
const ARC_RADIUS_X = Math.min(SCREEN_W * 0.44, 168);
const ARC_RADIUS_Y = 54;
const MIDDLE_SQUEEZE = 0.03;
const ARC_COINS = MEME_COINS.map((coin, i) => {
  let xLinear = -1 + (2 * i) / (MEME_COINS.length - 1);
  if (i === 2) xLinear += MIDDLE_SQUEEZE;
  if (i === 3) xLinear -= MIDDLE_SQUEEZE;
  const xNorm = Math.sign(xLinear) * Math.pow(Math.abs(xLinear), 0.86);
  const x = xNorm * ARC_RADIUS_X;
  let y = -Math.sqrt(1 - xNorm * xNorm) * ARC_RADIUS_Y;
  if (i === 2 || i === 3) y -= 6;
  return { ...coin, x, y, size: 42, opacity: 0.92, delay: i * 300 };
});

function ArcCoin({ coin, x, y, size, opacity, delay }: {
  coin: typeof MEME_COINS[0]; x: number; y: number; size: number; opacity: number; delay: number;
}) {
  const tx = -y / (ARC_RADIUS_Y || 1);
  const ty = x / (ARC_RADIUS_X || 1);
  const len = Math.sqrt(tx * tx + ty * ty) || 1;
  const tanX = (tx / len) * 12;
  const tanY = (ty / len) * 12;
  const radX = (-ty / len) * 5;
  const radY = (tx / len) * 5;

  const arcDrift = useSharedValue(0);
  const radDrift = useSharedValue(0);

  useEffect(() => {
    arcDrift.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 3500 + delay * 0.3, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
    radDrift.value = withDelay(
      delay + 400,
      withRepeat(withTiming(1, { duration: 2800 + delay * 0.2, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (arcDrift.value - 0.5) * tanX + (radDrift.value - 0.5) * radX },
      { translateY: (arcDrift.value - 0.5) * tanY + (radDrift.value - 0.5) * radY },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.arcCoin,
        { left: "50%", top: "50%", marginLeft: x - size / 2, marginTop: y - size / 2, opacity },
        animStyle,
      ]}
    >
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden" }}>
        <Image source={{ uri: coin.logo }} style={{ width: size, height: size }} />
      </View>
    </Animated.View>
  );
}

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
      // Connect wallet first
      const account = await connect();

      if (account) {
        const walletAddress = account.publicKey.toBase58();

        // Check if this wallet already has a username (returning user)
        const { data: existingWallet } = await supabase
          .from("users")
          .select("username")
          .eq("wallet_address", walletAddress)
          .limit(1);

        if (existingWallet && existingWallet.length > 0) {
          // Returning user — skip username validation, let them in
          setLoading(false);
          return;
        }

        // New user — check if username is taken
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

        // Insert new user
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

      setLoading(false);
    } catch (err: any) {
      setError("Wallet connection failed, try again");
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Grass texture base */}
      <ImageBackground
        source={grassTexture}
        style={StyleSheet.absoluteFillObject}
        imageStyle={{ resizeMode: "repeat" }}
      />
      {/* Dark gradient overlay */}
      <LinearGradient
        colors={["#0A1A0ECC", "#1B5E2055", "#0A0A0F99", "#2E1808CC", "#4A2E18DD", "#3A2010EE"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Wood tone bottom half */}
      <LinearGradient
        colors={["#00000000", "#00000000", "#1A100899", "#2E1F14AA"]}
        locations={[0, 0.5, 0.75, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Wood grain streaks */}
      <View style={styles.woodGrain} pointerEvents="none">
        {[6, 14, 22, 32, 42, 52, 62, 72, 80, 90].map((left, i) => (
          <View
            key={i}
            style={[styles.grain, { left: `${left}%` as any, opacity: 0.1 + (i % 3) * 0.02, width: i % 3 === 1 ? 1.5 : i % 3 === 2 ? 2.5 : 2 }]}
          />
        ))}
      </View>

      <View style={styles.content}>
        {/* Floating memecoin arc */}
        <View style={styles.arcContainer} pointerEvents="none">
          {ARC_COINS.map((ac, i) => (
            <ArcCoin key={i} coin={ac} x={ac.x} y={ac.y} size={ac.size} opacity={ac.opacity} delay={ac.delay} />
          ))}
        </View>

        {/* Horse silhouettes */}
        <View style={styles.horsesRow}>
          <Text style={[styles.horseChar, { color: COLORS.sandLight }]}>{"\u265E"}</Text>
          <Text style={[styles.horseChar, { color: COLORS.sand, fontSize: 40 }]}>{"\u265E"}</Text>
          <Text style={[styles.horseChar, { color: COLORS.cream, fontSize: 52 }]}>{"\u265E"}</Text>
          <Text style={[styles.horseChar, { color: COLORS.sand, fontSize: 40 }]}>{"\u265E"}</Text>
          <Text style={[styles.horseChar, { color: COLORS.sandLight }]}>{"\u265E"}</Text>
        </View>

        {/* Diamond separator */}
        <View style={styles.diamondRow}>
          <View style={styles.diamondLine} />
          <View style={styles.diamond} />
          <View style={styles.diamondLine} />
        </View>

        <Text style={styles.title}>DEGEN DERBY</Text>

        <View style={styles.subtitleRow}>
          <View style={styles.subtitleLine} />
          <Text style={styles.subtitle}>MEMECOIN RACING</Text>
          <View style={styles.subtitleLine} />
        </View>

        <View style={styles.taglineContainer}>
          <Text style={styles.tagline}>Pick a coin. Watch it race. Win SOL.</Text>
          <Text style={styles.description}>
            5 memecoins race based on real-time{"\n"}price action. Bet on the winner.
          </Text>
        </View>

        {/* Username input */}
        <TextInput
          style={styles.usernameInput}
          placeholder="Enter username"
          placeholderTextColor={COLORS.sand + "88"}
          value={username}
          onChangeText={(text) => {
            setUsername(text);
            setError(null);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
          editable={!loading}
        />

        {/* Error message */}
        {error && <Text style={styles.error}>{error}</Text>}

        {/* Connect button */}
        <Pressable
          onPress={handleConnect}
          disabled={!isValidUsername || loading}
          style={({ pressed }) => [pressed && { opacity: 0.8 }]}
        >
          <LinearGradient
            colors={isValidUsername ? [COLORS.grass, COLORS.grassDark] : ["#555555", "#333333"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.connectBtn, !isValidUsername && { opacity: 0.4 }]}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.cream} size="small" />
            ) : (
              <Text style={styles.connectText}>Connect Wallet</Text>
            )}
          </LinearGradient>
        </Pressable>

        {/* Track accent */}
        <View style={styles.trackAccent}>
          <View style={styles.trackDot} />
          <View style={[styles.trackDash, { width: 20 }]} />
          <View style={styles.trackDot} />
          <View style={[styles.trackDash, { width: 30 }]} />
          <View style={styles.trackDot} />
          <View style={[styles.trackDash, { width: 20 }]} />
          <View style={styles.trackDot} />
        </View>
      </View>

      <Text style={styles.footer}>Built on Solana</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1A0E",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 30,
  },
  arcContainer: {
    width: ARC_RADIUS_X * 2 + 56,
    height: ARC_RADIUS_Y + 28,
    alignSelf: "center",
    marginBottom: -70,
  },
  arcCoin: {
    position: "absolute",
  },
  horsesRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 24,
    transform: [{ scaleX: -1 }],
  },
  horseChar: {
    fontSize: 34,
    fontWeight: "900",
    opacity: 0.7,
  },
  diamondRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "80%",
    marginBottom: 12,
  },
  diamondLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.sand + "33",
  },
  diamond: {
    width: 8,
    height: 8,
    backgroundColor: COLORS.sand,
    transform: [{ rotate: "45deg" }],
    marginHorizontal: 12,
  },
  title: {
    fontSize: 38,
    fontWeight: "900",
    color: COLORS.cream,
    letterSpacing: 8,
    textShadowColor: COLORS.grassDark,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 32,
    width: "80%",
  },
  subtitleLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.sandDark + "44",
  },
  subtitle: {
    fontSize: 10,
    color: COLORS.sandLight,
    letterSpacing: 5,
    fontWeight: "700",
    marginHorizontal: 12,
  },
  taglineContainer: {
    alignItems: "center",
    marginBottom: 36,
    paddingHorizontal: 16,
  },
  tagline: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.cream,
    textAlign: "center",
    marginBottom: 10,
  },
  description: {
    fontSize: 13,
    color: COLORS.sandLight + "AA",
    textAlign: "center",
    lineHeight: 20,
  },
  usernameInput: {
    backgroundColor: COLORS.sand + "18",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.sand + "33",
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 260,
    color: COLORS.cream,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 14,
  },
  error: {
    color: COLORS.danger,
    fontSize: 12,
    marginBottom: 8,
  },
  connectBtn: {
    paddingHorizontal: 52,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 260,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#43A04766",
  },
  connectText: {
    color: COLORS.cream,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 2,
  },
  trackAccent: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 32,
    gap: 6,
  },
  trackDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.sand + "44",
  },
  trackDash: {
    height: 1,
    backgroundColor: COLORS.sand + "33",
  },
  woodGrain: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "40%",
    overflow: "hidden",
  },
  grain: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "#1A1008",
    borderRadius: 1,
  },
  footer: {
    position: "absolute",
    bottom: 8,
    alignSelf: "center",
    color: COLORS.warmBrown + "88",
    fontSize: 10,
    letterSpacing: 1,
  },
});