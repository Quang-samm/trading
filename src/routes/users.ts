import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';
import { User } from '../types';
import { createNonceAccount, checkNonce } from '../services/solana';

const router = Router();

// Create user
router.post('/users', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ 
        error: 'Wallet address is required' 
      });
    }

    // Check if user already exists
    const existingUser = db.getUserByWallet(walletAddress);
    if (existingUser) {
      return res.status(409).json({ 
        error: 'User with this wallet address already exists',
        user: existingUser
      });
    }

    const user: User = {
      id: uuidv4(),
      walletAddress,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const createdUser = db.createUser(user);
    res.status(201).json({ user: createdUser });

  } catch (error) {
    console.error('[API] Create user error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Get nonce account transaction
router.post('/users/:id/nonce-account', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const user = db.getUserById(id);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    const nonceAccountData = await createNonceAccount(user.walletAddress);
    
    res.json({
      transaction: nonceAccountData.transaction,
      noncePubkey: nonceAccountData.noncePubkey
    });

  } catch (error) {
    console.error('[API] Create nonce account error:', error);
    res.status(500).json({ 
      error: 'Failed to create nonce account transaction' 
    });
  }
});

// Add nonce account to user
router.put('/users/:id/nonce-account', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nonceAccount } = req.body;

    if (!nonceAccount) {
      return res.status(400).json({ 
        error: 'Nonce account address is required' 
      });
    }

    const user = db.getUserById(id);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    // Verify nonce account
    const isValid = await checkNonce(nonceAccount, user.walletAddress);
    
    if (!isValid) {
      return res.status(400).json({ 
        error: 'Invalid nonce account or not authorized by user wallet' 
      });
    }

    const updatedUser = db.updateUser(id, { nonceAccount });
    
    res.json({ 
      message: 'Nonce account added successfully',
      user: updatedUser 
    });

  } catch (error) {
    console.error('[API] Add nonce account error:', error);
    res.status(500).json({ 
      error: 'Failed to add nonce account' 
    });
  }
});

// Get user by ID
router.get('/users/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const user = db.getUserById(id);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    res.json({ user });

  } catch (error) {
    console.error('[API] Get user error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Get user by wallet address
router.get('/users/wallet/:address', (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    const user = db.getUserByWallet(address);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    res.json({ user });

  } catch (error) {
    console.error('[API] Get user by wallet error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

export default router;