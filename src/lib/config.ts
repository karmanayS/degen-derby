// App configuration loaded from environment or hardcoded for dev
// Replace these with your actual Supabase project values

const Config = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "YOUR_SUPABASE_URL",
  SUPABASE_ANON_KEY:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "YOUR_SUPABASE_ANON_KEY",
  SOLANA_RPC_URL:
    process.env.EXPO_PUBLIC_SOLANA_RPC_URL ??
    "https://api.devnet.solana.com",
} as const;

export default Config;