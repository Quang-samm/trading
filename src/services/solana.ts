import { Connection, PublicKey, Keypair, Transaction, SystemProgram, NonceAccount } from '@solana/web3.js';
import { RPC_URL, NONCE_ACCOUNT_LENGTH } from '../config/constants';

export const connection = new Connection(RPC_URL, 'confirmed');

export async function createNonceAccount(user: string) {
  try {
    const nonceAccount = Keypair.generate();
    
    const lamports = await connection.getMinimumBalanceForRentExemption(NONCE_ACCOUNT_LENGTH);

    const tx = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: new PublicKey(user),
        newAccountPubkey: nonceAccount.publicKey,
        lamports,
        space: NONCE_ACCOUNT_LENGTH,
        programId: SystemProgram.programId,
      }),
      SystemProgram.nonceInitialize({
        noncePubkey: nonceAccount.publicKey,
        authorizedPubkey: new PublicKey(user),
      }),
    );

    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = new PublicKey(user);

    const serialized = tx.serialize({ 
      requireAllSignatures: false, 
      verifySignatures: false 
    });
    const base64 = Buffer.from(serialized).toString("base64");

    return { 
      transaction: base64, 
      noncePubkey: nonceAccount.publicKey.toBase58() 
    };
  } catch (error) {
    console.error('[Solana] Failed to create nonce account:', error);
    throw new Error('Failed to create nonce account transaction');
  }
}

export async function checkNonce(nonce: string, wallet: string): Promise<boolean> {
  try {
    const info = await connection.getAccountInfo(new PublicKey(nonce));
    if (!info) return false;
    
    const data = NonceAccount.fromAccountData(info.data);
    return data.authorizedPubkey.toString() === wallet;
  } catch (error) {
    console.error('[Solana] Failed to check nonce:', error);
    return false;
  }
}

export { connection }