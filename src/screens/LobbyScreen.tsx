import React, { useState, useEffect, memo } from "react";
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { RaceCard } from "../components/common/RaceCard";
import { useRaces } from "../hooks/useRaces";
import { useRaceScheduler } from "../hooks/useRaceScheduler";
import { Race } from "../types";
import { s, fs, vs } from "../lib/responsive";

const T = {
  bg: "#0D2214",
  surface: "#12110D",
  green: "#00FF88",
  gold: "#D4A84B",
  greenDim: "#1B5E20",
  sand: "#C2A878",
  sandLight: "#D7C29E",
  brownDark: "#2A1A0D",
  muted: "#4E342E",
  cream: "#EDEDED",
};

type Filter = "all" | "upcoming" | "live" | "finished";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All Races" },
  { key: "live", label: "Live" },
  { key: "upcoming", label: "Upcoming" },
  { key: "finished", label: "Finished" },
];

// eslint-disable-next-line @typescript-eslint/no-var-requires
const grassTexture = require("../../assets/images/grass-turf.png");

const GrassTurfBackground = memo(function GrassTurfBackground() {
  const shimmer1 = useSharedValue(0);
  const shimmer2 = useSharedValue(0);

  useEffect(() => {
    shimmer1.value = withRepeat(
      withTiming(1, { duration: 10000, easing: Easing.inOut(Easing.sin) }),
      -1, true,
    );
    shimmer2.value = withRepeat(
      withTiming(1, { duration: 14000, easing: Easing.inOut(Easing.sin) }),
      -1, true,
    );
  }, []);

  const wave1 = useAnimatedStyle(() => ({
    opacity: 0.04 + shimmer1.value * 0.06,
    transform: [{ translateX: shimmer1.value * 14 - 7 }],
  }));
  const wave2 = useAnimatedStyle(() => ({
    opacity: 0.03 + shimmer2.value * 0.05,
    transform: [{ translateX: -(shimmer2.value * 10 - 5) }],
  }));

  return (
    <View style={styles.grassBg} pointerEvents="none">
      <ImageBackground
        source={grassTexture}
        style={StyleSheet.absoluteFillObject}
        imageStyle={{ resizeMode: "repeat" }}
      />

      <LinearGradient
        colors={["#00000020", "#00000000", "#0A1A0E18", "#00000000", "#00000020"]}
        start={{ x: 0, y: 0.1 }}
        end={{ x: 1, y: 0.9 }}
        style={StyleSheet.absoluteFillObject}
      />

      <LinearGradient
        colors={["#00000000", "#ffffff06", "#00000000"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0.18, 0.22, 0.26]}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={["#00000000", "#00000010", "#00000000"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0.42, 0.46, 0.50]}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={["#00000000", "#ffffff05", "#00000000"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0.66, 0.70, 0.74]}
        style={StyleSheet.absoluteFillObject}
      />

      <Animated.View style={[styles.shimmerWave, { top: "20%", height: 100 }, wave1]}>
        <LinearGradient
          colors={["#00000000", "#2E7D3210", "#43A04708", "#00000000"]}
          start={{ x: 0, y: 0.2 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
      <Animated.View style={[styles.shimmerWave, { top: "60%", height: 90 }, wave2]}>
        <LinearGradient
          colors={["#00000000", "#2E7D320C", "#00000000"]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 0.6 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      <LinearGradient
        colors={["#00000030", "#00000000", "#00000000", "#00000030"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={["#00000020", "#00000000", "#00000000", "#00000018"]}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
});

function BlinkingDot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.2);
  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 600, easing: Easing.inOut(Easing.sin) }), -1, true)
    );
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.dot, style]} />;
}

export function LobbyScreen() {
  const navigation = useNavigation<any>();
  const { races, loading, refetch } = useRaces();
  const [filter, setFilter] = useState<Filter>("all");

  useRaceScheduler();

  const filteredRaces = races.filter((r) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  const noActiveRaces = races.length > 0 && races.every((r) => r.status === "finished");

  const handleRacePress = (race: Race) => {
    if (race.status === "finished") {
      navigation.navigate("Results", { raceId: race.id });
    } else {
      navigation.navigate("Race", { raceId: race.id, race });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <GrassTurfBackground />

      {/* Filter pills */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f.key && styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={T.gold} style={{ marginTop: vs(40) }} />
      ) : (
        <>
        {noActiveRaces && (
          <View style={styles.banner}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: s(4) }}>
              <Text style={styles.bannerText}>Races will start soon</Text>
              <BlinkingDot delay={0} />
              <BlinkingDot delay={200} />
              <BlinkingDot delay={400} />
            </View>
          </View>
        )}
        <FlatList
          data={filteredRaces}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RaceCard
              race={item}
              onPress={() => handleRacePress(item)}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refetch}
              tintColor={T.gold}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {races.length > 0 && races.every((r) => r.status === "finished")
                  ? "Races will start soon"
                  : "No races found"}
              </Text>
              <Text style={styles.emptySubtext}>Pull down to refresh</Text>
            </View>
          }
        />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1A0E",
  },
  grassBg: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  shimmerWave: {
    position: "absolute",
    left: s(-24),
    right: s(-24),
    overflow: "hidden",
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: s(14),
    paddingTop: vs(8),
    paddingBottom: vs(10),
    gap: s(8),
    zIndex: 1,
  },
  filterBtn: {
    paddingHorizontal: s(14),
    paddingVertical: vs(8),
    borderRadius: s(20),
    backgroundColor: "#1A2E1F",
    borderWidth: 1,
    borderColor: "#2E7D32" + "44",
  },
  filterBtnActive: {
    backgroundColor: T.gold + "18",
    borderColor: T.gold,
  },
  filterText: {
    color: T.sandLight,
    fontSize: fs(12),
    fontWeight: "700",
  },
  filterTextActive: {
    color: T.gold,
    fontWeight: "800",
  },
  banner: {
    alignItems: "center" as const,
    paddingVertical: vs(12),
    marginHorizontal: s(14),
    marginTop: vs(4),
    borderRadius: s(10),
    backgroundColor: T.gold + "18",
    borderWidth: 1,
    borderColor: T.gold + "44",
    zIndex: 1,
  },
  bannerText: {
    color: T.gold,
    fontSize: fs(13),
    fontWeight: "700" as const,
  },
  dot: {
    width: s(5),
    height: s(5),
    borderRadius: s(2.5),
    backgroundColor: T.gold,
    marginTop: vs(2),
  },
  list: {
    paddingBottom: vs(24),
    paddingTop: vs(4),
  },
  empty: {
    alignItems: "center",
    paddingTop: vs(60),
  },
  emptyText: {
    color: T.sandLight,
    fontSize: fs(14),
    fontWeight: "700",
  },
  emptySubtext: {
    color: T.muted,
    fontSize: fs(11),
    marginTop: vs(4),
  },
});