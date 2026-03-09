import { DEXSCREENER_BASE_URL, FALLBACK_COINS } from "./constants";

export interface DexScreenerPair {
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceUsd: string;
  priceChange: {
    h1: number;
    h24: number;
  };
  liquidity?: {
    usd: number;
  };
  info?: {
    imageUrl?: string;
  };
  chainId: string;
  fdv?: number;
}

interface TokenPriceResult {
  address: string;
  symbol: string;
  name: string;
  price: number;
  priceChange24h: number;
  logo: string;
}

export async function getTokenPrice(
  tokenAddress: string
): Promise<TokenPriceResult | null> {
  try {
    const res = await fetch(
      `${DEXSCREENER_BASE_URL}/latest/dex/tokens/${tokenAddress}`
    );
    const data = await res.json();

    if (!data.pairs || data.pairs.length === 0) return null;

    // Get the pair with highest liquidity on Solana
    const solanaPairs = data.pairs.filter(
      (p: DexScreenerPair) => p.chainId === "solana"
    );
    if (solanaPairs.length === 0) return null;

    let bestPair : DexScreenerPair = solanaPairs[0];
    for (let i=0;i<solanaPairs.length;i++) {
      if (!bestPair) {
        bestPair = solanaPairs[i]
      } else if ( (solanaPairs[i].liquidity?.usd ?? 0) > (bestPair.liquidity?.usd ?? 0) ) {
        bestPair = solanaPairs[i]
      }
    }
    return {
      address: bestPair.baseToken.address,
      symbol: bestPair.baseToken.symbol,
      name: bestPair.baseToken.name,
      price: parseFloat(bestPair.priceUsd),
      priceChange24h: bestPair.priceChange?.h24 ?? 0,
      logo: bestPair.info?.imageUrl ?? "",
    };
  } catch {
    return null;
  }
}

export async function getTokenDetailedInfo(
  tokenAddress: string
): Promise<DexScreenerPair | null> {
  try {
    const res = await fetch(
      `${DEXSCREENER_BASE_URL}/latest/dex/tokens/${tokenAddress}`
    );
    const data = await res.json();

    if (!data.pairs || data.pairs.length === 0) return null;

    const solanaPairs = data.pairs.filter(
      (p: DexScreenerPair) => p.chainId === "solana"
    );
    if (solanaPairs.length === 0) return null;

    let bestPair: DexScreenerPair = solanaPairs[0];
    for (let i = 0; i < solanaPairs.length; i++) {
      if (
        !bestPair ||
        (solanaPairs[i].liquidity?.usd ?? 0) > (bestPair.liquidity?.usd ?? 0)
      ) {
        bestPair = solanaPairs[i];
      }
    }
    return bestPair;
  } catch {
    return null;
  }
}

export async function getMultipleTokenPrices(
  addresses: string[]
): Promise<TokenPriceResult[]> {
  if (addresses.length === 0) return [];

  try {
    // DexScreener supports comma-separated addresses (max 30)
    const chunks: string[][] = [];
    for (let i = 0; i < addresses.length; i += 30) {
      chunks.push(addresses.slice(i, i + 30));
    }

    const results: TokenPriceResult[] = [];

    for (const chunk of chunks) {
      const res = await fetch(
        `${DEXSCREENER_BASE_URL}/latest/dex/tokens/${chunk.join(",")}`
      );
      const data = await res.json();

      if (!data.pairs || data.pairs.length === 0) continue;

      const solanaPairs = data.pairs.filter(
        (p: DexScreenerPair) => p.chainId === "solana"
      );

      // Group pairs by token address, pick highest liquidity pair per token
      const bestByToken = new Map<string, DexScreenerPair>();
      for (const pair of solanaPairs) {
        const addr = pair.baseToken.address;
        const existing = bestByToken.get(addr);
        if (
          !existing ||
          (pair.liquidity?.usd ?? 0) > (existing.liquidity?.usd ?? 0)
        ) {
          bestByToken.set(addr, pair);
        }
      }

      for (const [, pair] of bestByToken) {
        results.push({
          address: pair.baseToken.address,
          symbol: pair.baseToken.symbol,
          name: pair.baseToken.name,
          price: parseFloat(pair.priceUsd),
          priceChange24h: pair.priceChange?.h24 ?? 0,
          logo: pair.info?.imageUrl ?? "",
        });
      }
    }

    return results;
  } catch {
    // Fallback to individual calls if batch fails
    const results = await Promise.all(addresses.map(getTokenPrice));
    return results.filter((r): r is TokenPriceResult => r !== null);
  }
}

interface BoostedToken {
  tokenAddress: string;
  chainId: string;
  description?: string;
  icon?: string;
}

export async function getTrendingTokens(): Promise<
  { address: string; symbol: string; name: string; logo: string }[]
> {
  try {
    const res = await fetch(
      `${DEXSCREENER_BASE_URL}/token-boosts/latest/v1`
    );
    const data: BoostedToken[] = await res.json();

    // Filter for Solana tokens and deduplicate
    const seen = new Set<string>();
    const solanaTokens = data.filter((t) => {
      if (t.chainId !== "solana" || seen.has(t.tokenAddress)) return false;
      seen.add(t.tokenAddress);
      return true;
    });

    // Fetch details for top 20 in a single batch call
    const top = solanaTokens.slice(0, 20);
    const topAddresses = top.map((t) => t.tokenAddress);
    const batchPrices = await getMultipleTokenPrices(topAddresses);

    // Build icon lookup from boosted data
    const iconByAddress = new Map<string, string>();
    for (const t of top) {
      if (t.icon) iconByAddress.set(t.tokenAddress, t.icon);
    }

    const results = batchPrices.map((p) => ({
      address: p.address,
      symbol: p.symbol,
      name: p.name,
      logo: p.logo || iconByAddress.get(p.address) || "",
    }));

    // If we got fewer than 5, pad with fallbacks
    if (results.length < 5) {
      const fallbacks = FALLBACK_COINS.filter(
        (f) => !results.some((r) => r.address === f.address)
      ).map((f) => ({
        address: f.address,
        symbol: f.symbol,
        name: f.name,
        logo: "",
      }));
      results.push(...fallbacks);
    }

    return results;
  } catch {
    // Return fallback coins on error
    return FALLBACK_COINS.map((f) => ({
      address: f.address,
      symbol: f.symbol,
      name: f.name,
      logo: "",
    }));
  }
}