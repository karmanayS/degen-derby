import { CoinPrice } from "../types";

const MAX_TRACK_PERCENT = 85; // Leader gets 85% of track width

export interface HorsePosition {
  symbol: string;
  address: string;
  percentChange: number;
  trackPosition: number; // 0-85% of track width
  rank: number;
}

export function calculatePositions(prices: CoinPrice[]): HorsePosition[] {
  if (prices.length === 0) return [];

  // Sort by percent change descending
  const sorted = [...prices].sort(
    (a, b) => b.percentChange - a.percentChange
  );

  const maxChange = sorted[0].percentChange;
  const minChange = sorted[sorted.length - 1].percentChange;
  const range = maxChange - minChange;

  return sorted.map((coin, index) => {
    let trackPosition: number;

    if (range === 0) {
      // All coins have same change — line them up evenly
      trackPosition = MAX_TRACK_PERCENT * 0.5;
    } else {
      // Normalize: leader at MAX_TRACK_PERCENT, others proportionally behind
      // Shift so min is at 10% (so even the last horse isn't at 0)
      const normalized = (coin.percentChange - minChange) / range;
      trackPosition = 10 + normalized * (MAX_TRACK_PERCENT - 10);
    }

    return {
      symbol: coin.symbol,
      address: coin.address,
      percentChange: coin.percentChange,
      trackPosition,
      rank: index + 1,
    };
  });
}

export function calculateOdds(
  bets: { pickedCoin: string; amount: number }[]
): Record<string, number> {
  const totalPool = bets.reduce((sum, b) => sum + b.amount, 0);
  if (totalPool === 0) return {};

  const coinTotals: Record<string, number> = {};
  for (const bet of bets) {
    coinTotals[bet.pickedCoin] = (coinTotals[bet.pickedCoin] ?? 0) + bet.amount;
  }

  const odds: Record<string, number> = {};
  for (const [coin, amount] of Object.entries(coinTotals)) {
    // Parimutuel odds: total pool / amount on this coin
    odds[coin] = Math.round((totalPool / amount) * 10) / 10;
  }

  return odds;
}

export function calculatePayouts(
  bets: { walletAddress: string; pickedCoin: string; amount: number }[],
  winningCoin: string,
  houseCutPercent: number
): { walletAddress: string; payout: number }[] {
  const totalPool = bets.reduce((sum, b) => sum + b.amount, 0);
  const houseCut = totalPool * (houseCutPercent / 100);
  const winnerPool = totalPool - houseCut;

  const winningBets = bets.filter((b) => b.pickedCoin === winningCoin);
  const totalWinningBets = winningBets.reduce((sum, b) => sum + b.amount, 0);

  if (winningBets.length === 0 || totalWinningBets === 0) {
    // No one picked the winner — no payouts
    return [];
  }

  return winningBets.map((bet) => ({
    walletAddress: bet.walletAddress,
    payout: (bet.amount / totalWinningBets) * winnerPool,
  }));
}