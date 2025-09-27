export const TRADING_POOL = "8vZHTVMdYvcPFUoHBEbcFyfSKnjWtvbNgYpXg1aiC2uS";
export const BASE_MINT = "So11111111111111111111111111111111111111112"; // SOL
export const QUOTE_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // USDC
export const BASE_DECIMAL = 9;
export const QUOTE_DECIMAL = 6;
export const NONCE_ACCOUNT_LENGTH = 80;

export const POOL_PAIRS = [
  TRADING_POOL,
  // Add more pool addresses as needed
];

export const GECKO_BASE = "https://api.geckoterminal.com/api/v2";

// Multiple RPC endpoints for fallback
export const RPC_ENDPOINTS = [
  process.env.RPC_URL,
  "https://solana-api.projectserum.com",
  "https://rpc.ankr.com/solana",
  "https://solana-mainnet.rpc.extrnode.com",
  "https://api.mainnet-beta.solana.com"
].filter(Boolean) as string[];

export const RPC_URL = RPC_ENDPOINTS[0];