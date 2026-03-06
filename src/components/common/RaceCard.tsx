import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { Race } from "../../types";
import { COLORS } from "../../lib/constants";

interface RaceCardProps {
  race: Race;
  onPress: () => void;
  isVip?: boolean;
}

export function RaceCard({ race, onPress, isVip }: RaceCardProps) {
  const [now, setNow] = useState(Date.now());

  // Tick every second so the timer updates
  useEffect(() => {
    if (race.status === "finished") return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [race.status]);

  const startMs = new Date(race.startTime).getTime();
  const endMs = new Date(race.endTime).getTime();

  // Derive live status from time (don't rely only on DB status)
  let displayStatus = race.status;
  if (race.status === "upcoming" && now >= startMs) {
    displayStatus = "live";
  }
  if (race.status === "live" && now >= endMs) {
    displayStatus = "finished";
  }

  const statusColor = {
    upcoming: COLORS.warning,
    live: COLORS.primary,
    finished: COLORS.textMuted,
  }[displayStatus];

  const statusLabel = {
    upcoming: "UPCOMING",
    live: "LIVE",
    finished: "FINISHED",
  }[displayStatus];

  const durationLabel = formatDuration(race.raceDuration);

  let timeLabel = "";
  if (displayStatus === "upcoming") {
    const secsUntil = Math.max(0, Math.floor((startMs - now) / 1000));
    timeLabel = `Starts in ${formatDuration(secsUntil)}`;
  } else if (displayStatus === "live") {
    const secsLeft = Math.max(0, Math.floor((endMs - now) / 1000));
    timeLabel = `${formatDuration(secsLeft)} left`;
  }

  return (
    <TouchableOpacity
      style={[styles.card, isVip && styles.vipCard]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header row */}
      <View style={styles.header}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
        {isVip && (
          <View style={styles.vipBadge}>
            <Text style={styles.vipText}>VIP</Text>
          </View>
        )}
        <Text style={styles.duration}>{durationLabel} race</Text>
      </View>

      {/* Coin icons row */}
      <View style={styles.coinsRow}>
        {race.coins.map((coin) => (
          <View key={coin.address} style={styles.coinChip}>
            {coin.logo ? (
              <Image source={{ uri: coin.logo }} style={styles.coinIcon} />
            ) : (
              <View style={[styles.coinIcon, styles.coinIconPlaceholder]}>
                <Text style={styles.coinIconText}>{coin.symbol[0]}</Text>
              </View>
            )}
            <Text style={styles.coinSymbol} numberOfLines={1}>
              {coin.symbol}
            </Text>
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.entryFee}>{race.entryFee} SOL</Text>
        <Text style={styles.pot}>
          Pot: {race.totalPot.toFixed(2)} SOL
        </Text>
        {timeLabel ? (
          <Text style={[styles.timeLabel, { color: statusColor }]}>
            {timeLabel}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function formatDuration(seconds: number): string {
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h`;
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  return `${seconds}s`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 6,
  },
  vipCard: {
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    color: COLORS.background,
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  vipBadge: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 6,
  },
  vipText: {
    color: COLORS.background,
    fontSize: 10,
    fontWeight: "bold",
  },
  duration: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginLeft: "auto",
  },
  coinsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  coinChip: {
    alignItems: "center",
    flex: 1,
  },
  coinIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  coinIconPlaceholder: {
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  coinIconText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "bold",
  },
  coinSymbol: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 4,
    maxWidth: 55,
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  entryFee: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
  },
  pot: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
});