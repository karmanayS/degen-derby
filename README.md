# Degen Derby

Horse racing, but the horses are real memecoins.

Pick 5 random memecoins. They appear as characters on a race track. Over the next few minutes, whichever coin gains the most % in price wins the race. Bet SOL on which horse will win.

## How It Works

1. **Browse Races** - See upcoming and live races in the lobby
2. **Pick Your Horse** - Choose which memecoin you think will pump the hardest
3. **Place Your Bet** - Send SOL via Mobile Wallet Adapter (Phantom, Solflare)
4. **Watch the Race** - Real-time price data drives the race animation
5. **Collect Winnings** - Parimutuel payouts: popular picks pay less, underdogs pay more

## Tech Stack

- **React Native + Expo** - Solana Mobile Expo Template
- **Mobile Wallet Adapter 2.0** - Native wallet connection on Android
- **Supabase** - Postgres database, Edge Functions, Realtime subscriptions
- **DexScreener API** - Real-time Solana memecoin price data
- **Solana web3.js** - SOL transfers for betting and payouts

## SKR Integration

SKR token holders unlock:
- VIP races with higher entry fees and bigger pots
- Access to 1-hour marathon races
- Gold border on leaderboard
- Custom race creation (pick your own coins)

## Setup

### Prerequisites

- Node.js 18+
- Yarn (`npm install -g yarn@1.22.22`)
- Android device or emulator
- Phantom or Solflare wallet app installed

### 1. Install Dependencies

```bash
yarn install
```

### 2. Configure Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migration SQL from `supabase/migrations/001_initial.sql` in the SQL Editor
3. Enable Realtime for `race_prices`, `races`, and `bets` tables
4. Copy your project URL and anon key

Update `src/lib/config.ts`:
```ts
const Config = {
  SUPABASE_URL: "https://your-project.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-key",
  SOLANA_RPC_URL: "https://api.devnet.solana.com",
};
```

### 3. Configure House Wallet

Generate a Solana keypair for the house wallet:
```bash
solana-keygen new --outfile house-wallet.json
```

Update `src/lib/constants.ts` with the public key.

For Edge Functions, add the private key as a Supabase secret:
```bash
supabase secrets set HOUSE_WALLET_PRIVATE_KEY="your-base58-private-key"
```

### 4. Deploy Edge Functions (Optional)

```bash
supabase functions deploy create-race
supabase functions deploy update-prices
supabase functions deploy settle-race
```

The app includes client-side price polling as a fallback, so edge functions aren't required for basic testing.

### 5. Run the App

```bash
# Start the development server
yarn start

# Or build a development APK
yarn build
```

### 6. Testing

Use the **DEV** button (bottom-right corner) to:
- Create test races (1min, 5min, 15min)
- Start upcoming races immediately

Use devnet SOL for testing (airdrop via `solana airdrop 2`).

## Project Structure

```
src/
  components/
    race/          # HorseTrack, HorseLane, CoinPicker, BetConfirmModal, CountdownTimer
    common/        # RaceCard, WalletButton, SkrBadge, DevMenu
  screens/         # Splash, Lobby, Race, Results, Leaderboard, Profile
  hooks/           # useRaces, useRaceLive, useBet, useSkrStatus, useLeaderboard
  lib/             # supabase, dexscreener, solana, skr, race-engine, constants
  types/           # TypeScript interfaces
  navigators/      # App navigation (stack + bottom tabs)
  utils/           # MWA wallet hooks (from Solana Mobile template)
supabase/
  migrations/      # Database schema
  functions/       # Edge Functions (Deno)
```

## Architecture

```
Phone App (React Native)
    |
    |  fetches races, submits bets, watches live prices
    |
Supabase (Database + Realtime + Edge Functions)
    |
    |  stores races, bets, leaderboard; broadcasts price updates
    |
DexScreener API (Price Data)
    |
    |  real-time memecoin prices, trending tokens
    |
Solana Blockchain (SOL transfers)
    |
    |  entry fees in, payouts out via house wallet
```

## Built for Solana Mobile Monolith Hackathon 2026