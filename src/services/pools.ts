import axios from "axios";
import { LiquidityBookServices, MODE } from "@saros-finance/dlmm-sdk";
import { PublicKey } from "@solana/web3.js";
import { getPriceFromId } from "@saros-finance/dlmm-sdk/utils/price";
import { Metaplex } from "@metaplex-foundation/js";
import { connection, RPC_URL } from "./solana";
import { PoolData } from "../types";
import { GECKO_BASE } from "../config/constants";

export class PoolService {
  private lb: LiquidityBookServices;
  private metaplex: Metaplex;

  constructor() {
    this.lb = new LiquidityBookServices({ 
      mode: MODE.MAINNET, 
      options: { rpcUrl: RPC_URL } 
    });
    this.metaplex = Metaplex.make(connection);
  }

  async fetchPoolsData(pairs: string[]): Promise<PoolData[]> {
    const results: PoolData[] = [];
    
    console.log(`[Pools] Fetching data for ${pairs.length} pairs`);

    for (const pair of pairs) {
      try {
        const poolData = await this.fetchSinglePoolData(pair);
        if (poolData) {
          results.push(poolData);
        }
      } catch (error) {
        console.error(`[Pools] Failed to fetch data for pair ${pair}:`, error);
      }
    }

    console.log(`[Pools] Successfully fetched ${results.length} pools`);
    return results;
  }

  private async fetchSinglePoolData(pair: string): Promise<PoolData | null> {
    try {
      const pooldata = await executeWithRpcFallback(() => lb.fetchPoolMetadata(pair));
      
      const tokenBaseDecimal = pooldata.extra.tokenBaseDecimal;
      const tokenQuoteDecimal = pooldata.extra.tokenQuoteDecimal;

      const pairInfo = await executeWithRpcFallback(() => lb.getPairAccount(new PublicKey(pair)));
      const activeId = pairInfo.activeId;
      const binStep = pairInfo.binStep;
      const price = getPriceFromId(binStep, activeId, tokenBaseDecimal, tokenQuoteDecimal) as unknown as number;

      // Fetch OHLCV data
      const [res1, res2] = await Promise.all([
        axios.get(`${GECKO_BASE}/networks/solana/pools/${pair}/ohlcv/hour?limit=1`),
        axios.get(`${GECKO_BASE}/networks/solana/pools/${pair}/ohlcv/day?limit=1`)
      ]);

      const ohlcv1 = res1.data.data.attributes.ohlcv_list[0];
      const onehrchange = 100 * (ohlcv1[4] - ohlcv1[1]) / ohlcv1[1];

      const ohlcv2 = res2.data.data.attributes.ohlcv_list[0];
      const onedaychange = 100 * (ohlcv2[4] - ohlcv2[1]) / ohlcv2[1];

      const baseSymbol = res1.data.meta.base.symbol as string;
      const quoteSymbol = res1.data.meta.quote.symbol as string;

      const basemint = pooldata.baseMint as string;
      const quotemint = pooldata.quoteMint as string;

      // Get token logos
      const baseLogo = await this.getTokenLogo(basemint);
      const quoteLogo = await this.getTokenLogo(quotemint);

      const numofBase = Number(pooldata.baseReserve) / tokenBaseDecimal;
      const numofQuote = Number(pooldata.quoteReserve) / tokenQuoteDecimal;
      const currentprice = Number((price as unknown as number).toFixed ? (price as unknown as number).toFixed(12) : price);
      const totalliquidity = numofBase * currentprice + numofQuote;

      return {
        pooladdress: pair,
        basemint,
        quotemint,
        currentprice,
        onehrchange,
        onedaychange,
        totalliquidity,
        baseSymbol,
        baseLogo,
        quoteSymbol,
        quoteLogo,
        numofBase,
        numofQuote,
      };
    } catch (error) {
      console.error(`[Pools] Error fetching single pool data for ${pair}:`, error);
      return null;
    }
  }

  private async getTokenLogo(mint: string): Promise<string> {
    if (mint === "So11111111111111111111111111111111111111112") {
      return "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png";
    }
    
    if (mint === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v") {
      return "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png";
    }

    try {
      const nft = await this.metaplex.nfts().findByMint({ 
        mintAddress: new PublicKey(mint) 
      });
      const json = (nft as any).json ?? {};
      return json.image ?? "";
    } catch {
      return "";
    }
  }

  async fetchCurrentPrice(pool: string): Promise<number | null> {
    try {
      const poolKey = new PublicKey(pool);
      const [pairInfo, pairMetadata] = await Promise.all([
        this.lb.getPairAccount(poolKey),
        this.lb.fetchPoolMetadata(pool),
      ]);
      
      const tokenBaseDecimal = pairMetadata.extra.tokenBaseDecimal;
      const tokenQuoteDecimal = pairMetadata.extra.tokenQuoteDecimal;
      const activeBinId = pairInfo.activeId;
      
      let currentPrice = getPriceFromId(
        pairInfo.binStep, 
        activeBinId, 
        tokenBaseDecimal, 
        tokenQuoteDecimal
      ) as unknown as number;
      
      currentPrice = Number(Number(currentPrice).toFixed(9));
      return currentPrice;
    } catch (error) {
      console.error(`[Pools] Failed to fetch current price for ${pool}:`, error);
      return null;
    }
  }
}

export const poolService = new PoolService();