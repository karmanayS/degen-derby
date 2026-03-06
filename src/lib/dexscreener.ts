import { DEXSCREENER_BASE_URL, FALLBACK_COINS } from "./constants";

interface DexScreenerPair {
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

export async function getMultipleTokenPrices(
  addresses: string[]
): Promise<TokenPriceResult[]> {
  const results = await Promise.all(addresses.map(getTokenPrice));
  return results.filter((r): r is TokenPriceResult => r !== null);
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

    // Fetch details for top 20
    const top = solanaTokens.slice(0, 20);
    const detailed = await Promise.all(
      top.map(async (t) => {
        const price = await getTokenPrice(t.tokenAddress);
        if (!price) return null;
        return {
          address: price.address,
          symbol: price.symbol,
          name: price.name,
          logo: price.logo || t.icon || "",
        };
      })
    );

    const results = detailed.filter(
      (d): d is NonNullable<typeof d> => d !== null
    );

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