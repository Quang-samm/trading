import { Router, Request, Response } from 'express';
import { db } from '../database';

const router = Router();

// Get all pools
router.get('/pools', (req: Request, res: Response) => {
  try {
    const pools = db.getAllPools();
    res.json({ pools });
  } catch (error) {
    console.error('[API] Get pools error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch pools' 
    });
  }
});

// Get specific pool
router.get('/pools/:address', (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const pool = db.getPool(address);
    
    if (!pool) {
      return res.status(404).json({ 
        error: 'Pool not found' 
      });
    }

    res.json({ pool });
  } catch (error) {
    console.error('[API] Get pool error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch pool' 
    });
  }
});

export default router;