import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { RaceCard } from "../components/common/RaceCard";
import { WalletButton } from "../components/common/WalletButton";
import { SkrBadge } from "../components/common/SkrBadge";
import { useRaces } from "../hooks/useRaces";
import { useSkrStatus } from "../hooks/useSkrStatus";
import { useAuthorization } from "../utils/useAuthorization";
import { Race } from "../types";
import { COLORS, ENTRY_FEES } from "../lib/constants";

type Filter = "all" | "upcoming" | "live" | "finished";

export function LobbyScreen() {
  const navigation = useNavigation<any>();
  const { races, loading, refetch } = useRaces();
  const { hasSkr, skrBalance } = useSkrStatus();
  const { selectedAccount } = useAuthorization();
  const [filter, setFilter] = useState<Filter>("all");

  const filteredRaces = races.filter((r) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  // Separate VIP races (high entry fee)
  const standardRaces = filteredRaces.filter(
    (r) => r.entryFee <= ENTRY_FEES.STANDARD
  );
  const vipRaces = filteredRaces.filter(
    (r) => r.entryFee > ENTRY_FEES.STANDARD
  );

  const handleRacePress = (race: Race) => {
    navigation.navigate("Race", { raceId: race.id, race });
  };

  const renderRace = ({ item }: { item: Race }) => (
    <RaceCard race={item} onPress={() => handleRacePress(item)} />
  );

  const renderVipRace = ({ item }: { item: Race }) => (
    <RaceCard race={item} onPress={() => handleRacePress(item)} isVip />
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>DEGEN DERBY</Text>
          {hasSkr && <SkrBadge balance={skrBalance} compact />}
        </View>
        <WalletButton />
      </View>

      {/* Filter tabs */}
      <View style={styles.filters}>
        {(["all", "upcoming", "live", "finished"] as Filter[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.activeFilter]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.activeFilterText,
              ]}
            >
              {f.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={standardRaces}
        renderItem={renderRace}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refetch}
            tintColor={COLORS.primary}
          />
        }
        ListHeaderComponent={
          hasSkr && vipRaces.length > 0 ? (
            <View style={styles.vipSection}>
              <Text style={styles.sectionTitle}>VIP RACES</Text>
              {vipRaces.map((race) => (
                <RaceCard
                  key={race.id}
                  race={race}
                  onPress={() => handleRacePress(race)}
                  isVip
                />
              ))}
              <Text style={styles.sectionTitle}>STANDARD RACES</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {loading ? "Loading races..." : "No races found"}
            </Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 8,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
  },
  filters: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.surface,
  },
  activeFilter: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  activeFilterText: {
    color: COLORS.background,
  },
  list: {
    paddingBottom: 20,
  },
  vipSection: {
    marginBottom: 8,
  },
  sectionTitle: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  empty: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});