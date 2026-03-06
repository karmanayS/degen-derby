import { PublicKey } from "@solana/web3.js";

// House wallet that receives entry fees and sends payouts
export const HOUSE_WALLET = new PublicKey(
  "E5GgmF6PDNQPAWwLbBHoy75eX7U5bSjT2yDpbHv5qg6V"
);

// SKR token mint address on Solana mainnet
export const SKR_MINT = new PublicKey(
  "SKRMoowmPFFrGLfSwR2md6K7MjDYR2r7ZVByudDk9nK"
);

// Race configuration
export const RACE_DURATIONS = {
  QUICK: 60, // 1 minute (testing)
  SHORT: 300, // 5 minutes
  MEDIUM: 900, // 15 minutes
  LONG: 3600, // 1 hour (VIP only)
} as const;

export const ENTRY_FEES = {
  STANDARD: 0.05, // SOL
  VIP: 0.5, // SOL (SKR holders only)
} as const;

export const HOUSE_CUT_PERCENT = 5; // 5% of pot

// Price polling interval during live races (ms)
export const PRICE_POLL_INTERVAL = 5000;

// DexScreener API
export const DEXSCREENER_BASE_URL = "https://api.dexscreener.com";

// Curated fallback memecoins (Solana) if trending API returns junk
export const FALLBACK_COINS = [
  { address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", symbol: "BONK", name: "Bonk" },
  { address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", symbol: "WIF", name: "dogwifhat" },
  { address: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr", symbol: "POPCAT", name: "Popcat" },
  { address: "ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82", symbol: "BOME", name: "Book of Meme" },
  { address: "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5", symbol: "MEW", name: "cat in a dogs world" },
  { address: "A8C3xuqscfmyLrQ3HwSSXP813pUwB3NETnRBJiKYampw", symbol: "SLERF", name: "SLERF" },
] as const;

// Theme colors
export const COLORS = {
  background: "#0A0A0F",
  surface: "#1A1A2E",
  surfaceLight: "#252540",
  primary: "#00FF88",
  danger: "#FF4444",
  warning: "#FFB800",
  gold: "#FFD700",
  text: "#FFFFFF",
  textSecondary: "#8888AA",
  textMuted: "#555570",
} as const;