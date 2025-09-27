import { LiquidityBookServices, MODE } from "@saros-finance/dlmm-sdk";
import { PublicKey } from "@solana/web3.js";
import { db } from "../database";
import { Order, OrderStatus, OrderType, BuyOrder, SellOrder } from "../types";
import { TRADING_POOL, BASE_MINT, QUOTE_MINT, BASE_DECIMAL, QUOTE_DECIMAL, RPC_URL } from "../config/constants";

export class OrderExecutionService {
  private lb: LiquidityBookServices;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.lb = new LiquidityBookServices({ 
      mode: MODE.MAINNET, 
      options: { rpcUrl: RPC_URL } 
    });
  }

  startOrderMonitoring(): void {
    if (this.monitoringInterval) {
      return; // Already monitoring
    }

    console.log('[Orders] Starting order monitoring service');
    
    // Check orders every 10 seconds
    this.monitoringInterval = setInterval(async () => {
      await this.checkAndExecuteOrders();
    }, 10000);

    // Initial check
    this.checkAndExecuteOrders();
  }

  stopOrderMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('[Orders] Stopped order monitoring service');
    }
  }

  private async checkAndExecuteOrders(): Promise<void> {
    const pendingOrders = db.getPendingOrders();
    const currentPrice = db.getCurrentPrice(TRADING_POOL);

    if (!currentPrice) {
      console.warn('[Orders] No current price available for trading pool');
      return;
    }

    console.log(`[Orders] Checking ${pendingOrders.length} pending orders (current price: ${currentPrice})`);

    for (const order of pendingOrders) {
      try {
        await this.evaluateOrder(order, currentPrice);
      } catch (error) {
        console.error(`[Orders] Failed to evaluate order ${order.id}:`, error);
      }
    }
  }

  private async evaluateOrder(order: Order, currentPrice: number): Promise<void> {
    const shouldExecute = this.shouldExecuteOrder(order, currentPrice);
    
    if (!shouldExecute) {
      return;
    }

    console.log(`[Orders] Executing order ${order.id} (${order.type}) at price ${currentPrice}`);

    try {
      const quoteData = await this.getQuoteForOrder(order);
      
      if (!quoteData) {
        throw new Error('Failed to get quote data');
      }

      // Check if the quote meets our requirements
      if (!this.validateQuote(order, quoteData, currentPrice)) {
        console.log(`[Orders] Quote validation failed for order ${order.id}`);
        return;
      }

      // In a real implementation, you would execute the transaction here
      // For now, we'll just mark the order as filled
      await this.markOrderAsFilled(order, currentPrice);

    } catch (error) {
      console.error(`[Orders] Failed to execute order ${order.id}:`, error);
      db.updateOrder(order.id, { 
        status: OrderStatus.FAILED,
        updatedAt: new Date()
      });
    }
  }

  private shouldExecuteOrder(order: Order, currentPrice: number): boolean {
    if (order.type === OrderType.BUY) {
      const buyOrder = order as BuyOrder;
      // Buy when current price is at or below limit price
      return currentPrice <= buyOrder.limitPrice;
    }
    
    if (order.type === OrderType.SELL) {
      const sellOrder = order as SellOrder;
      // Sell when price hits take profit (above) or stop loss (below)
      if (currentPrice >= sellOrder.takeProfit) {
        return true;
      }
      if (currentPrice <= sellOrder.stopLoss) {
        return true;
      }
    }

    return false;
  }

  private async getQuoteForOrder(order: Order): Promise<any> {
    const amountFrom = BigInt(Math.floor(order.amount * (order.type === OrderType.BUY ? Math.pow(10, QUOTE_DECIMAL) : Math.pow(10, BASE_DECIMAL))));

    const quoteData = await executeWithRpcFallback(() =>
      lb.getQuote({
        amount: BigInt(Math.floor(order.amount * (order.type === 'buy' ? Math.pow(10, QUOTE_DECIMAL) : Math.pow(10, BASE_DECIMAL)))),
        isExactInput: true,
        swapForY: order.type === OrderType.BUY, // true for buying SOL (swap USDC to SOL)
        pair: new PublicKey(TRADING_POOL),
        tokenBase: new PublicKey(BASE_MINT),
        tokenQuote: new PublicKey(QUOTE_MINT),
        tokenBaseDecimal: BASE_DECIMAL,
        tokenQuoteDecimal: QUOTE_DECIMAL,
        slippage: order.slippage
      })
    );

    return quoteData;
  }

  private validateQuote(order: Order, quoteData: any, currentPrice: number): boolean {
    const amountOut = Number(quoteData.outAmount);

    // For buy orders, check if we get enough SOL for our USDC
    if (order.type === OrderType.BUY) {
      const buyOrder = order as BuyOrder;
      const solReceived = amountOut / Math.pow(10, BASE_DECIMAL);
      return solReceived >= order.amount;
    }

    // For sell orders, check if we get enough USDC for our SOL
    if (order.type === OrderType.SELL) {
      const usdcReceived = amountOut / Math.pow(10, QUOTE_DECIMAL);
      // For sell orders, we just need to get some USDC for our SOL
      return usdcReceived > 0;
    }

    return false;
  }

  private async markOrderAsFilled(order: Order, executionPrice: number): Promise<void> {
    db.updateOrder(order.id, {
      status: OrderStatus.FILLED,
      executedAt: new Date(),
      updatedAt: new Date(),
      // In real implementation, you would set the actual transaction signature
      transactionSignature: `mock_tx_${Date.now()}`
    });

    console.log(`[Orders] Order ${order.id} filled at price ${executionPrice}`);
  }
}

export const orderExecutionService = new OrderExecutionService();