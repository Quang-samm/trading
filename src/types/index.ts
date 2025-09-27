export interface PoolData {
  pooladdress: string;
  basemint: string;
  quotemint: string;
  currentprice: number;
  onehrchange: number;
  onedaychange: number;
  totalliquidity: number;
  baseSymbol: string;
  baseLogo: string;
  quoteSymbol: string;
  quoteLogo: string;
  numofBase: number;
  numofQuote: number;
}

export interface User {
  id: string;
  walletAddress: string;
  nonceAccount?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum OrderType {
  BUY = 'BUY',
  SELL = 'SELL'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  FILLED = 'FILLED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED'
}

export interface BaseOrder {
  id: string;
  userId: string;
  type: OrderType;
  amount: number;
  slippage: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  executedAt?: Date;
  transactionSignature?: string;
}

export interface BuyOrder extends BaseOrder {
  type: OrderType.BUY;
  limitPrice: number;
}

export interface SellOrder extends BaseOrder {
  type: OrderType.SELL;
  stopLoss: number;
  takeProfit: number;
}

export type Order = BuyOrder | SellOrder;

export interface PriceMessage {
  type: "price";
  pool: string;
  price: number;
  ts: number;
}