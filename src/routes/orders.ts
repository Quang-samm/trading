import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';
import { Order, OrderType, OrderStatus, BuyOrder, SellOrder } from '../types';

const router = Router();

// Create order
router.post('/orders', async (req: Request, res: Response) => {
  try {
    const { 
      userId, 
      type, 
      amount, 
      slippage,
      limitPrice,
      stopLoss,
      takeProfit
    } = req.body;

    // Validation
    if (!userId || !type || !amount || slippage === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, type, amount, slippage' 
      });
    }

    // Check if user exists
    const user = db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    // Validate order type
    if (!Object.values(OrderType).includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid order type. Must be BUY or SELL' 
      });
    }

    // Validate common numeric values
    if (amount <= 0 || slippage < 0 || slippage > 100) {
      return res.status(400).json({ 
        error: 'Invalid numeric values' 
      });
    }

    let order: Order;

    if (type === OrderType.BUY) {
      // Buy order validation
      if (!limitPrice || limitPrice <= 0) {
        return res.status(400).json({ 
          error: 'Buy orders require a valid limitPrice' 
        });
      }

      order = {
        id: uuidv4(),
        userId,
        type: OrderType.BUY,
        amount,
        limitPrice,
        slippage,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      } as BuyOrder;

    } else if (type === OrderType.SELL) {
      // Sell order validation
      if (!stopLoss || !takeProfit || stopLoss <= 0 || takeProfit <= 0) {
        return res.status(400).json({ 
          error: 'Sell orders require valid stopLoss and takeProfit values' 
        });
      }

      if (stopLoss >= takeProfit) {
        return res.status(400).json({ 
          error: 'stopLoss must be less than takeProfit for sell orders' 
        });
      }

      order = {
        id: uuidv4(),
        userId,
        type: OrderType.SELL,
        amount,
        stopLoss,
        takeProfit,
        slippage,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      } as SellOrder;
    } else {
      return res.status(400).json({ 
        error: 'Invalid order type' 
      });
    }

    const createdOrder = db.createOrder(order);
    
    res.status(201).json({ 
      message: 'Order created successfully',
      order: createdOrder 
    });

  } catch (error) {
    console.error('[API] Create order error:', error);
    res.status(500).json({ 
      error: 'Failed to create order' 
    });
  }
});

// Get user orders
router.get('/users/:userId/orders', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const user = db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    const orders = db.getOrdersByUserId(userId);
    
    res.json({ orders });

  } catch (error) {
    console.error('[API] Get user orders error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch orders' 
    });
  }
});

// Get order by ID
router.get('/orders/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const order = db.getOrderById(id);
    if (!order) {
      return res.status(404).json({ 
        error: 'Order not found' 
      });
    }

    res.json({ order });

  } catch (error) {
    console.error('[API] Get order error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch order' 
    });
  }
});

// Cancel order
router.delete('/orders/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const order = db.getOrderById(id);
    if (!order) {
      return res.status(404).json({ 
        error: 'Order not found' 
      });
    }

    if (order.status !== OrderStatus.PENDING) {
      return res.status(400).json({ 
        error: 'Can only cancel pending orders' 
      });
    }

    const updatedOrder = db.updateOrder(id, { 
      status: OrderStatus.CANCELLED,
      updatedAt: new Date()
    });

    res.json({ 
      message: 'Order cancelled successfully',
      order: updatedOrder 
    });

  } catch (error) {
    console.error('[API] Cancel order error:', error);
    res.status(500).json({ 
      error: 'Failed to cancel order' 
    });
  }
});

export default router;