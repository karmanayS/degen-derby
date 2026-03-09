import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Line, Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { fs, vs } from "../../lib/responsive";

interface PricePoint {
  t: number;
  value: number;
}

interface MiniPriceChartProps {
  data: PricePoint[];
  width: number;
  height: number;
  color?: string;
}

const C = {
  green: "#00FF88",
  red: "#FF4444",
  muted: "#6D4C41",
  surface: "#2A2A1E",
};

export function MiniPriceChart({ data, width, height, color }: MiniPriceChartProps) {
  if (data.length < 2) {
    return (
      <View style={[styles.placeholder, { width, height }]}>
        <Text style={styles.placeholderText}>Collecting chart data...</Text>
      </View>
    );
  }

  const padding = { top: 10, bottom: 24, left: 0, right: 0 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const buffer = range * 0.1;

  const effectiveMin = minVal - buffer;
  const effectiveMax = maxVal + buffer;
  const effectiveRange = effectiveMax - effectiveMin;

  const netChange = data[data.length - 1].value - data[0].value;
  const lineColor = color || (netChange >= 0 ? C.green : C.red);

  const toX = (i: number) =>
    padding.left + (i / (data.length - 1)) * chartW;
  const toY = (val: number) =>
    padding.top + chartH - ((val - effectiveMin) / effectiveRange) * chartH;

  // Build line path
  let linePath = `M ${toX(0)},${toY(data[0].value)}`;
  for (let i = 1; i < data.length; i++) {
    linePath += ` L ${toX(i)},${toY(data[i].value)}`;
  }

  // Build fill path (close to bottom)
  const fillPath =
    linePath +
    ` L ${toX(data.length - 1)},${padding.top + chartH}` +
    ` L ${toX(0)},${padding.top + chartH} Z`;

  // Baseline at 0% if visible in range
  const zeroY = effectiveMin <= 0 && effectiveMax >= 0 ? toY(0) : null;

  const lastX = toX(data.length - 1);
  const lastY = toY(data[data.length - 1].value);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={lineColor} stopOpacity="0.25" />
            <Stop offset="1" stopColor={lineColor} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Fill area */}
        <Path d={fillPath} fill="url(#fillGrad)" />

        {/* Baseline at 0% */}
        {zeroY !== null && (
          <Line
            x1={padding.left}
            y1={zeroY}
            x2={padding.left + chartW}
            y2={zeroY}
            stroke={C.muted}
            strokeWidth={1}
            strokeDasharray="4,4"
            opacity={0.5}
          />
        )}

        {/* Line */}
        <Path d={linePath} fill="none" stroke={lineColor} strokeWidth={2} />

        {/* Current point dot */}
        <Circle cx={lastX} cy={lastY} r={3.5} fill={lineColor} />
      </Svg>

      {/* X-axis labels */}
      <View style={styles.xLabels}>
        <Text style={styles.xLabel}>START</Text>
        <Text style={styles.xLabel}>NOW</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 8,
  },
  placeholderText: {
    color: C.muted,
    fontSize: fs(11),
  },
  xLabels: {
    position: "absolute",
    bottom: vs(2),
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  xLabel: {
    color: C.muted,
    fontSize: fs(8),
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
