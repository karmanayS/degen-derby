import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

// Baseline dimensions (standard iPhone design reference)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// Scale based on screen width ratio
export const s = (size: number): number => (width / BASE_WIDTH) * size;

// Scale based on screen height ratio
export const vs = (size: number): number => (height / BASE_HEIGHT) * size;

// Moderate scale for font sizes (less aggressive scaling)
export const fs = (size: number, factor = 0.5): number =>
  size + (s(size) - size) * factor;

// Screen dimensions for direct use
export const SCREEN_WIDTH = width;
export const SCREEN_HEIGHT = height;
