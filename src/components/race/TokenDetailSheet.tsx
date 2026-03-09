import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import Toast from "react-native-toast-message";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import MaterialCommunityIcon from "@expo/vector-icons/MaterialCommunityIcons";
import { useTokenDetail } from "../../hooks/useTokenDetail";
import { Race, CoinPrice } from "../../types";
import { HorsePosition } from "../../lib/race-engine";
import { s, fs, vs } from "../../lib/responsive";

const C = {
  sand: "#C2A878",
  sandLight: "#D7C29E",
  cream: "#EDEDED",
  surface: "#1A1A12",
  surfaceLight: "#2A2A1E",
  border: "#3A3A28",
  green: "#00FF88",
  gold: "#F0D050",
  danger: "#FF4444",
  muted: "#6D4C41",
};

interface TokenDetailSheetProps {
  visible: boolean;
  coinAddress: string | null;
  race: Race;
  positions: HorsePosition[];
  latestPrices: CoinPrice[];
  onClose: () => void;
}

function formatUsd(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

function formatPrice(price: number): string {
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toPrecision(4)}`;
}

function formatPct(val: number | undefined): string {
  if (val === undefined || val === null) return "--";
  const sign = val >= 0 ? "+" : "";
  return `${sign}${val.toFixed(2)}%`;
}

export function TokenDetailSheet({
  visible,
  coinAddress,
  race,
  positions,
  latestPrices,
  onClose,
}: TokenDetailSheetProps) {
  const { dexData, loading } = useTokenDetail(
    visible ? coinAddress : null,
    race.id,
    latestPrices
  );

  const coin = race.coins.find((c) => c.address === coinAddress);
  const position = positions.find((p) => p.address === coinAddress);
  const livePrice = latestPrices.find((p) => p.address === coinAddress);

  if (!coin) return null;

  const pctChange = livePrice?.percentChange ?? position?.percentChange ?? 0;
  const rank = position?.rank;
  const currentPrice = livePrice?.price ?? (dexData ? parseFloat(dexData.priceUsd) : coin.startPrice);

  const handleCopyAddress = async () => {
    if (coinAddress) {
      await Clipboard.setStringAsync(coinAddress);
      Toast.show({ type: "success", text1: "Copied", text2: "Token address copied to clipboard" });
    }
  };

  const handleOpenDexScreener = () => {
    if (coinAddress) {
      WebBrowser.openBrowserAsync(`https://dexscreener.com/solana/${coinAddress}`);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <View style={styles.sheet}>
          {/* Drag handle */}
          <View style={styles.handleBar} />

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                {coin.logo ? (
                  <Image source={{ uri: coin.logo }} style={styles.logo} />
                ) : (
                  <View style={[styles.logo, styles.logoPlaceholder]}>
                    <Text style={styles.logoText}>{coin.symbol[0]}</Text>
                  </View>
                )}
                <View>
                  <Text style={styles.coinName}>{coin.name}</Text>
                  <Text style={styles.coinSymbol}>{coin.symbol}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <MaterialCommunityIcon name="close" size={s(20)} color={C.sandLight} />
              </TouchableOpacity>
            </View>

            {/* Race Performance */}
            <View style={styles.perfSection}>
              <View style={styles.perfItem}>
                <Text style={styles.perfLabel}>RACE CHANGE</Text>
                <Text
                  style={[
                    styles.perfValue,
                    { color: pctChange >= 0 ? C.green : C.danger },
                  ]}
                >
                  {formatPct(pctChange)}
                </Text>
              </View>
              {rank && (
                <View style={styles.perfItem}>
                  <Text style={styles.perfLabel}>RANK</Text>
                  <Text style={[styles.perfValue, rank === 1 && { color: C.gold }]}>
                    #{rank}
                  </Text>
                </View>
              )}
              <View style={styles.perfItem}>
                <Text style={styles.perfLabel}>PRICE</Text>
                <Text style={styles.perfValueSmall}>{formatPrice(currentPrice)}</Text>
              </View>
            </View>

            {/* DexScreener Link */}
            <TouchableOpacity style={styles.dexLink} onPress={handleOpenDexScreener} activeOpacity={0.7}>
              <MaterialCommunityIcon name="chart-line" size={s(20)} color={C.green} />
              <Text style={styles.dexLinkText}>View Chart on DexScreener</Text>
              <MaterialCommunityIcon name="open-in-new" size={s(16)} color={C.sandLight} />
            </TouchableOpacity>

            {/* Market Data */}
            {loading ? (
              <ActivityIndicator color={C.gold} style={styles.loader} />
            ) : dexData ? (
              <View style={styles.marketGrid}>
                <View style={styles.marketRow}>
                  <View style={styles.marketCell}>
                    <Text style={styles.marketLabel}>1H CHANGE</Text>
                    <Text
                      style={[
                        styles.marketValue,
                        {
                          color:
                            (dexData.priceChange?.h1 ?? 0) >= 0
                              ? C.green
                              : C.danger,
                        },
                      ]}
                    >
                      {formatPct(dexData.priceChange?.h1)}
                    </Text>
                  </View>
                  <View style={styles.marketCell}>
                    <Text style={styles.marketLabel}>24H CHANGE</Text>
                    <Text
                      style={[
                        styles.marketValue,
                        {
                          color:
                            (dexData.priceChange?.h24 ?? 0) >= 0
                              ? C.green
                              : C.danger,
                        },
                      ]}
                    >
                      {formatPct(dexData.priceChange?.h24)}
                    </Text>
                  </View>
                </View>
                <View style={styles.marketRow}>
                  <View style={styles.marketCell}>
                    <Text style={styles.marketLabel}>FDV</Text>
                    <Text style={styles.marketValue}>
                      {dexData.fdv ? formatUsd(dexData.fdv) : "--"}
                    </Text>
                  </View>
                  <View style={styles.marketCell}>
                    <Text style={styles.marketLabel}>LIQUIDITY</Text>
                    <Text style={styles.marketValue}>
                      {dexData.liquidity?.usd
                        ? formatUsd(dexData.liquidity.usd)
                        : "--"}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Start Price */}
            <View style={styles.startPriceRow}>
              <Text style={styles.startPriceLabel}>START PRICE</Text>
              <Text style={styles.startPriceValue}>{formatPrice(coin.startPrice)}</Text>
            </View>

            {/* Token Address */}
            <TouchableOpacity style={styles.addressRow} onPress={handleCopyAddress} activeOpacity={0.7}>
              <View>
                <Text style={styles.addressLabel}>TOKEN ADDRESS</Text>
                <Text style={styles.addressValue}>
                  {coinAddress!.slice(0, 16)}...{coinAddress!.slice(-8)}
                </Text>
              </View>
              <MaterialCommunityIcon name="content-copy" size={s(16)} color={C.sandLight} />
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: s(20),
    borderTopRightRadius: s(20),
    paddingHorizontal: s(20),
    paddingBottom: vs(32),
    maxHeight: "85%",
    borderTopWidth: 1,
    borderColor: C.border,
  },
  handleBar: {
    width: s(40),
    height: vs(4),
    backgroundColor: C.muted,
    borderRadius: s(2),
    alignSelf: "center",
    marginTop: vs(10),
    marginBottom: vs(16),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: vs(16),
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(12),
  },
  logo: {
    width: s(44),
    height: s(44),
    borderRadius: s(22),
    backgroundColor: C.surfaceLight,
  },
  logoPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    color: C.gold,
    fontSize: fs(20),
    fontWeight: "bold",
  },
  coinName: {
    color: C.cream,
    fontSize: fs(20),
    fontWeight: "900",
  },
  coinSymbol: {
    color: C.sandLight,
    fontSize: fs(12),
    fontWeight: "600",
    marginTop: vs(1),
  },
  closeBtn: {
    padding: s(8),
  },
  perfSection: {
    flexDirection: "row",
    backgroundColor: C.surfaceLight,
    borderRadius: s(12),
    padding: s(14),
    marginBottom: vs(14),
    gap: s(8),
  },
  perfItem: {
    flex: 1,
    alignItems: "center",
  },
  perfLabel: {
    color: C.muted,
    fontSize: fs(8),
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: vs(4),
  },
  perfValue: {
    color: C.cream,
    fontSize: fs(22),
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  perfValueSmall: {
    color: C.cream,
    fontSize: fs(14),
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  dexLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: s(8),
    backgroundColor: C.surfaceLight,
    borderRadius: s(12),
    padding: s(14),
    marginBottom: vs(14),
    borderWidth: 1,
    borderColor: C.green + "33",
  },
  dexLinkText: {
    color: C.cream,
    fontSize: fs(14),
    fontWeight: "700",
  },
  loader: {
    marginVertical: vs(20),
  },
  marketGrid: {
    backgroundColor: C.surfaceLight,
    borderRadius: s(12),
    padding: s(12),
    marginBottom: vs(14),
    gap: vs(10),
  },
  marketRow: {
    flexDirection: "row",
    gap: s(10),
  },
  marketCell: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: s(8),
    padding: s(10),
    alignItems: "center",
  },
  marketLabel: {
    color: C.muted,
    fontSize: fs(8),
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: vs(4),
  },
  marketValue: {
    color: C.cream,
    fontSize: fs(15),
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  startPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.surfaceLight,
    borderRadius: s(12),
    padding: s(14),
    marginBottom: vs(14),
  },
  startPriceLabel: {
    color: C.muted,
    fontSize: fs(9),
    fontWeight: "700",
    letterSpacing: 1,
  },
  startPriceValue: {
    color: C.sandLight,
    fontSize: fs(14),
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.surfaceLight,
    borderRadius: s(12),
    padding: s(14),
    marginBottom: vs(8),
  },
  addressLabel: {
    color: C.muted,
    fontSize: fs(8),
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: vs(2),
  },
  addressValue: {
    color: C.sandLight,
    fontSize: fs(11),
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
});
