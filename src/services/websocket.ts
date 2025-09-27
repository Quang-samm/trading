import WebSocket from "ws";
import type { Server as HttpServer } from "http";
import { poolService } from "./pools";
import { db } from "../database";
import { PriceMessage } from "../types";

export class WebSocketService {
  private wss: WebSocket.Server;
  private priceUpdateIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(server: HttpServer, pools: string[]) {
    this.wss = new WebSocket.Server({ server });
    this.setupWebSocketServer();
    this.startPriceTracking(pools);
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('[WebSocket] New client connected');
      
      ws.on('close', () => {
        console.log('[WebSocket] Client disconnected');
      });

      ws.on('error', (error) => {
        console.error('[WebSocket] Client error:', error);
      });

      // Send current prices to new client
      this.sendCurrentPricesToClient(ws);
    });

    console.log('[WebSocket] Server initialized');
  }

  private sendCurrentPricesToClient(ws: WebSocket): void {
    const pools = db.getAllPools();
    pools.forEach(pool => {
      const message: PriceMessage = {
        type: 'price',
        pool: pool.pooladdress,
        price: pool.currentprice,
        ts: Date.now()
      };
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  private startPriceTracking(pools: string[]): void {
    pools.forEach(pool => {
      // Initial price fetch
      this.fetchAndBroadcastPrice(pool);
      
      // Set up interval for regular updates (12 seconds to avoid rate limits)
      const interval = setInterval(async () => {
        await this.fetchAndBroadcastPrice(pool);
      }, 12000);
      
      this.priceUpdateIntervals.set(pool, interval);
    });

    console.log(`[WebSocket] Started price tracking for ${pools.length} pools`);
  }

  private async fetchAndBroadcastPrice(pool: string): Promise<void> {
    try {
      const price = await poolService.fetchCurrentPrice(pool);
      if (price !== null) {
        // Update database
        db.updatePoolPrice(pool, price);
        
        // Broadcast to all connected clients
        this.broadcastPrice(pool, price);
      }
    } catch (error) {
      console.error(`[WebSocket] Failed to fetch price for ${pool}:`, error);
    }
  }

  private broadcastPrice(pool: string, price: number): void {
    const message: PriceMessage = {
      type: 'price',
      pool,
      price,
      ts: Date.now()
    };

    const payload = JSON.stringify(message);
    
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  public stopPriceTracking(): void {
    this.priceUpdateIntervals.forEach(interval => {
      clearInterval(interval);
    });
    this.priceUpdateIntervals.clear();
    console.log('[WebSocket] Stopped price tracking');
  }

  public getConnectedClients(): number {
    return this.wss.clients.size;
  }
}

export function startPriceWebSocketServer(server: HttpServer, pools: string[]): WebSocketService {
  return new WebSocketService(server, pools);
}