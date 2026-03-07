import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const GRAIN_A = [
  { c: "#4A3220", f: 2.5 }, { c: "#1E1208", f: 0.4 }, { c: "#3D2816", f: 1.8 },
  { c: "#261408", f: 0.3 }, { c: "#503826", f: 3.0 }, { c: "#1A0E06", f: 0.5 },
  { c: "#42301E", f: 2.2 }, { c: "#221208", f: 0.3 }, { c: "#4E3624", f: 2.8 },
  { c: "#2C1C10", f: 0.4 }, { c: "#3A2614", f: 1.5 }, { c: "#1C1008", f: 0.3 },
  { c: "#543C2A", f: 3.5 }, { c: "#2A1A0C", f: 0.5 }, { c: "#46321F", f: 2.0 },
  { c: "#1E1208", f: 0.3 }, { c: "#3E2A18", f: 2.6 }, { c: "#281A0C", f: 0.4 },
  { c: "#4C3422", f: 3.2 }, { c: "#1A0E08", f: 0.3 }, { c: "#402E1A", f: 2.4 },
  { c: "#241608", f: 0.5 }, { c: "#523A28", f: 2.8 }, { c: "#1E1008", f: 0.3 },
  { c: "#3C2816", f: 1.6 }, { c: "#2C1C0E", f: 0.4 }, { c: "#48341E", f: 3.0 },
  { c: "#201208", f: 0.3 }, { c: "#44301C", f: 2.2 }, { c: "#1C0E06", f: 0.5 },
  { c: "#503626", f: 3.4 }, { c: "#261810", f: 0.3 }, { c: "#3A2818", f: 1.8 },
  { c: "#221408", f: 0.4 }, { c: "#4A3420", f: 2.6 }, { c: "#1E1008", f: 0.3 },
  { c: "#42301E", f: 2.0 }, { c: "#2A1A0E", f: 0.5 }, { c: "#4E3624", f: 3.2 },
  { c: "#1A0E06", f: 0.3 }, { c: "#382414", f: 1.4 }, { c: "#2C1C10", f: 0.4 },
  { c: "#543C2A", f: 2.8 }, { c: "#201208", f: 0.3 }, { c: "#46321E", f: 2.4 },
  { c: "#1C1008", f: 0.5 }, { c: "#3E2A16", f: 1.6 }, { c: "#281A0C", f: 0.3 },
  { c: "#4C3422", f: 3.0 }, { c: "#1E1208", f: 0.4 }, { c: "#402C1A", f: 2.2 },
  { c: "#241608", f: 0.3 }, { c: "#503826", f: 3.4 }, { c: "#1A0E08", f: 0.5 },
  { c: "#3C2A16", f: 1.8 }, { c: "#2C1C0E", f: 0.3 }, { c: "#48341E", f: 2.6 },
  { c: "#201208", f: 0.4 }, { c: "#44321E", f: 2.0 }, { c: "#1C0E06", f: 0.3 },
];

const GRAIN_B = [
  { c: "#3E2A18", f: 1.8 }, { c: "#201008", f: 0.5 }, { c: "#4C3422", f: 3.2 },
  { c: "#181006", f: 0.3 }, { c: "#44301C", f: 2.4 }, { c: "#2A1A0E", f: 0.4 },
  { c: "#523A28", f: 3.6 }, { c: "#1E1208", f: 0.3 }, { c: "#3A2614", f: 1.6 },
  { c: "#261408", f: 0.5 }, { c: "#4E3624", f: 2.8 }, { c: "#1C0E08", f: 0.3 },
  { c: "#42301E", f: 2.0 }, { c: "#221208", f: 0.4 }, { c: "#503826", f: 3.4 },
  { c: "#1A1008", f: 0.3 }, { c: "#3C2816", f: 1.4 }, { c: "#2C1C10", f: 0.5 },
  { c: "#48341E", f: 2.6 }, { c: "#201208", f: 0.3 }, { c: "#46321F", f: 2.2 },
  { c: "#1E1008", f: 0.4 }, { c: "#543C2A", f: 3.0 }, { c: "#281A0C", f: 0.3 },
  { c: "#402E1A", f: 1.8 }, { c: "#241608", f: 0.5 }, { c: "#4A3220", f: 2.8 },
  { c: "#1C0E06", f: 0.3 }, { c: "#3E2A18", f: 2.4 }, { c: "#221408", f: 0.4 },
];

interface Props {
  opacity?: number;
  borderRadius?: number;
}

export default function WoodGrainTexture({ opacity = 0.30, borderRadius = 16 }: Props) {
  return (
    <View style={[styles.grainOverlay, { opacity, borderRadius }]} pointerEvents="none">
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#3A2414" }]} />

      <View style={styles.horizontalGrain}>
        {GRAIN_A.map((g, i) => (
          <View key={i} style={{ backgroundColor: g.c, flex: g.f, width: "100%" }} />
        ))}
      </View>

      <View style={[styles.horizontalGrain, { opacity: 0.4, top: 1 }]}>
        {GRAIN_B.map((g, i) => (
          <View key={i} style={{ backgroundColor: g.c, flex: g.f, width: "100%" }} />
        ))}
      </View>

      <View style={styles.verticalGrain}>
        <View style={{ backgroundColor: "#2A1A0E", flex: 0.6, height: "100%" }} />
        <View style={{ backgroundColor: "#4A3220", flex: 2.5, height: "100%" }} />
        <View style={{ backgroundColor: "#1E1008", flex: 0.3, height: "100%" }} />
        <View style={{ backgroundColor: "#3E2A18", flex: 3.0, height: "100%" }} />
        <View style={{ backgroundColor: "#221408", flex: 0.4, height: "100%" }} />
        <View style={{ backgroundColor: "#503826", flex: 2.0, height: "100%" }} />
        <View style={{ backgroundColor: "#2C1C10", flex: 0.5, height: "100%" }} />
        <View style={{ backgroundColor: "#46321E", flex: 3.5, height: "100%" }} />
        <View style={{ backgroundColor: "#1C0E06", flex: 0.3, height: "100%" }} />
        <View style={{ backgroundColor: "#402C1A", flex: 2.8, height: "100%" }} />
        <View style={{ backgroundColor: "#281A0C", flex: 0.4, height: "100%" }} />
        <View style={{ backgroundColor: "#4C3422", flex: 2.2, height: "100%" }} />
        <View style={{ backgroundColor: "#1A1008", flex: 0.3, height: "100%" }} />
        <View style={{ backgroundColor: "#3A2614", flex: 1.8, height: "100%" }} />
      </View>

      <LinearGradient
        colors={["#7B5A3810", "#00000000", "#8B6A4812", "#00000000", "#6B4A300E", "#00000000", "#7B5A3810"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <LinearGradient
        colors={["#5C3A200C", "#00000000", "#6B4A3010", "#00000000", "#5C3A200C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={[styles.knot, { top: "10%", left: "18%", width: 12, height: 9 }]} />
      <View style={[styles.knotInner, { top: "10.5%" as any, left: "19%", width: 6, height: 5 }]} />
      <View style={[styles.knot, { top: "38%", left: "68%", width: 10, height: 14, borderRadius: 6 }]} />
      <View style={[styles.knotInner, { top: "39%", left: "69%", width: 5, height: 7, borderRadius: 3 }]} />
      <View style={[styles.knot, { top: "65%", left: "32%", width: 14, height: 10 }]} />
      <View style={[styles.knotInner, { top: "66%", left: "33.5%" as any, width: 7, height: 5 }]} />
      <View style={[styles.knot, { top: "82%", left: "78%", width: 9, height: 12, borderRadius: 5 }]} />
      <View style={[styles.knotInner, { top: "83%", left: "79%", width: 5, height: 6, borderRadius: 3 }]} />

      <View style={[styles.ring, { top: "8%", left: "15%", width: 28, height: 22 }]} />
      <View style={[styles.ring, { top: "7%", left: "13%", width: 36, height: 28, borderWidth: 0.8, opacity: 0.12 }]} />
      <View style={[styles.ring, { top: "36%", left: "65%", width: 22, height: 28 }]} />
      <View style={[styles.ring, { top: "63%", left: "29%", width: 30, height: 22 }]} />
      <View style={[styles.ring, { top: "62%", left: "27%", width: 38, height: 28, borderWidth: 0.8, opacity: 0.12 }]} />

      <View style={[styles.crack, { top: "18%", left: "5%", width: "40%", height: 1 }]} />
      <View style={[styles.crack, { top: "18.3%" as any, left: "8%", width: "30%", height: 0.5, opacity: 0.08 }]} />
      <View style={[styles.crack, { top: "45%", left: "35%", width: "55%", height: 1, transform: [{ rotate: "-0.2deg" }] }]} />
      <View style={[styles.crack, { top: "45.4%" as any, left: "40%", width: "40%", height: 0.5, opacity: 0.08 }]} />
      <View style={[styles.crack, { top: "72%", left: "10%", width: "45%", height: 1, transform: [{ rotate: "0.3deg" }] }]} />
      <View style={[styles.crack, { top: "72.3%" as any, left: "15%", width: "30%", height: 0.5, opacity: 0.08 }]} />
      <View style={[styles.crack, { top: "90%", left: "50%", width: "40%", height: 1 }]} />

      <View style={[styles.scratch, { top: "22%", left: "55%", width: 40, height: 1, transform: [{ rotate: "8deg" }] }]} />
      <View style={[styles.scratch, { top: "50%", left: "15%", width: 30, height: 1, transform: [{ rotate: "-5deg" }] }]} />
      <View style={[styles.scratch, { top: "75%", left: "60%", width: 35, height: 1, transform: [{ rotate: "12deg" }] }]} />

      <LinearGradient
        colors={["#12080444", "#12080400", "#12080400", "#12080444"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={["#12080436", "#12080400", "#12080400", "#12080430"]}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grainOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    overflow: "hidden",
  },
  horizontalGrain: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.75,
  },
  verticalGrain: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    opacity: 0.2,
  },
  knot: {
    position: "absolute",
    backgroundColor: "#120804",
    borderRadius: 7,
    opacity: 0.35,
  },
  knotInner: {
    position: "absolute",
    backgroundColor: "#0A0402",
    borderRadius: 4,
    opacity: 0.25,
  },
  ring: {
    position: "absolute",
    borderWidth: 1.2,
    borderColor: "#1A0E0620",
    borderRadius: 12,
    backgroundColor: "transparent",
    opacity: 0.18,
  },
  crack: {
    position: "absolute",
    backgroundColor: "#0A060214",
  },
  scratch: {
    position: "absolute",
    backgroundColor: "#6B4A3018",
    borderRadius: 0.5,
  },
});