import { User, Order, PoolData } from '../types';

class InMemoryDatabase {
  private users: Map<string, User> = new Map();
  private orders: Map<string, Order> = new Map();
  private pools: Map<string, PoolData> = new Map();
  private currentPrices: Map<string, number> = new Map();

  // User methods
  createUser(user: User): User {
    this.users.set(user.id, user);
    return user;
  }

  getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  getUserByWallet(walletAddress: string): User | undefined {
    for (const user of this.users.values()) {
      if (user.walletAddress === walletAddress) {
        return user;
      }
    }
    return undefined;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  // Order methods
  createOrder(order: Order): Order {
    this.orders.set(order.id, order);
    return order;
  }

  getOrderById(id: string): Order | undefined {
    return this.orders.get(id);
  }

  getOrdersByUserId(userId: string): Order[] {
    return Array.from(this.orders.values()).filter(order => order.userId === userId);
  }

  getPendingOrders(): Order[] {
    return Array.from(this.orders.values()).filter(order => order.status === 'PENDING');
  }

  updateOrder(id: string, updates: Partial<Order>): Order | undefined {
    const order = this.orders.get(id);
    if (!order) return undefined;
    
    const updatedOrder = { ...order, ...updates, updatedAt: new Date() };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  deleteOrder(id: string): boolean {
    return this.orders.delete(id);
  }

  // Pool methods
  setPools(pools: PoolData[]): void {
    this.pools.clear();
    pools.forEach(pool => {
      this.pools.set(pool.pooladdress, pool);
    });
  }

  getPool(address: string): PoolData | undefined {
    return this.pools.get(address);
  }

  getAllPools(): PoolData[] {
    return Array.from(this.pools.values());
  }

  updatePoolPrice(poolAddress: string, price: number): void {
    this.currentPrices.set(poolAddress, price);
    const pool = this.pools.get(poolAddress);
    if (pool) {
      pool.currentprice = price;
      this.pools.set(poolAddress, pool);
    }
  }

  getCurrentPrice(poolAddress: string): number | undefined {
    return this.currentPrices.get(poolAddress);
  }
}

export const db = new InMemoryDatabase();