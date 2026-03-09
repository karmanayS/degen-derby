// Node.js script to process pending payout claims
// Polls the bets table for unclaimed winning bets and sends SOL from the house wallet
// Usage: node scripts/process-claims.js

const {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} = require("@solana/web3.js");
const { createClient } = require("@supabase/supabase-js");
require("dotenv/config");

// --- Config ---
const SUPABASE_URL = "https://sgibrenfgqozvtpqcmyz.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const POLL_INTERVAL_MS = 5000; // check every 5 seconds

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("ERROR: Set SUPABASE_SERVICE_ROLE_KEY environment variable");
  console.error(
    "Usage: SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/process-claims.js",
  );
  process.exit(1);
}

// Load house wallet from HOUSE_WALLET_SECRET env variable (JSON array string)
if (!process.env.HOUSE_WALLET_SECRET) {
  console.error("ERROR: Set HOUSE_WALLET_SECRET environment variable (JSON array of secret key bytes)");
  process.exit(1);
}
const secretKey = Uint8Array.from(JSON.parse(process.env.HOUSE_WALLET_SECRET));
const houseKeypair = Keypair.fromSecretKey(secretKey);

console.log(`House wallet: ${houseKeypair.publicKey.toBase58()}`);

const connection = new Connection(SOLANA_RPC_URL, "confirmed");
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function processOneClaim(bet) {
  const lamports = Math.round(Number(bet.payout) * LAMPORTS_PER_SOL);
  console.log(
    `Processing bet ${bet.id}: ${bet.payout} SOL -> ${bet.wallet_address}`,
  );

  try {
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: houseKeypair.publicKey,
        toPubkey: new PublicKey(bet.wallet_address),
        lamports,
      }),
    );

    const signature = await sendAndConfirmTransaction(connection, tx, [
      houseKeypair,
    ]);
    console.log(`  Sent! tx: ${signature}`);

    // Mark as claimed
    await supabase.from("bets").update({ claimed: true }).eq("id", bet.id);

    console.log(`  Marked as claimed.`);
  } catch (err) {
    console.error(`  Failed to process bet ${bet.id}:`, err.message);
  }
}

async function pollAndProcess() {
  // Find unclaimed winning bets (payout > 0, not yet claimed)
  const { data: bets, error } = await supabase
    .from("bets")
    .select("id, wallet_address, payout, race_id")
    .gt("payout", 0)
    .eq("claimed", false)
    .limit(10);

  if (error) {
    console.error("DB error:", error.message);
    return;
  }

  if (!bets || bets.length === 0) return;

  console.log(`Found ${bets.length} unclaimed payout(s)`);

  for (const bet of bets) {
    await processOneClaim(bet);
  }
}

async function main() {
  // Check house wallet balance
  const balance = await connection.getBalance(houseKeypair.publicKey);
  console.log(`House wallet balance: ${balance / LAMPORTS_PER_SOL} SOL`);
  console.log(
    `Polling for unclaimed payouts every ${POLL_INTERVAL_MS / 1000}s...\n`,
  );

  // Initial run
  await pollAndProcess();

  // Poll loop
  setInterval(pollAndProcess, POLL_INTERVAL_MS);
}

main().catch(console.error);
