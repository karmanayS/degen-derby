export interface Coin {
  address: string;
  name: string;
  symbol: string;
  logo: string;
  startPrice: number;
  endPrice?: number;
}

export interface Race {
  id: string;
  coins: Coin[];
  winningCoin?: string;
  entryFee: number;
  raceDuration: number; // seconds
  startTime: string;
  endTime: string;
  status: "upcoming" | "live" | "finished";
  totalPot: number;
  playerCount: number;
  createdAt: string;
}

export interface Bet {
  id: string;
  raceId: string;
  walletAddress: string;
  pickedCoin: string;
  amount: number;
  payout?: number;
  txSignature?: string;
  createdAt: string;
}

export interface LeaderboardEntry {
  walletAddress: string;
  username: string;
  degenScore: number;
  totalRaces: number;
  wins: number;
  winStreak: number;
  totalEarned: number;
}

export interface PriceSnapshot {
  id: string;
  raceId: string;
  prices: CoinPrice[];
  recordedAt: string;
}

export interface CoinPrice {
  symbol: string;
  address: string;
  price: number;
  percentChange: number;
}

export interface RaceOdds {
  [coinSymbol: string]: number; // multiplier e.g. 2.5x
}