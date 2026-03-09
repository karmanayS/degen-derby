// App configuration loaded from environment or hardcoded for dev
// Replace these with your actual Supabase project values

const Config = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://sgibrenfgqozvtpqcmyz.supabase.co",
  SUPABASE_ANON_KEY:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnaWJyZW5mZ3FvenZ0cHFjbXl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MzU5NDYsImV4cCI6MjA4ODMxMTk0Nn0.pecm9y0b9faC3mIE2zMrEdibjaj-_gagrr6xqgR0PHI",
  SOLANA_RPC_URL:
    process.env.EXPO_PUBLIC_SOLANA_RPC_URL ??
    "https://api.mainnet-beta.solana.com",
} as const;

export default Config;