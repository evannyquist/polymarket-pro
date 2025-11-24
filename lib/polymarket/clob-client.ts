/**
 * Polymarket CLOB API Client
 * Documentation: https://docs.polymarket.com/
 */

const CLOB_API_BASE = 'https://clob.polymarket.com';

export interface OrderRequest {
  tokenID: string;
  price: number; // 0-1 range
  size: number; // Amount in USDC
  side: 'BUY' | 'SELL';
  feeRateBps?: number;
  nonce?: number;
  expiration?: number;
}

export interface SignedOrder extends OrderRequest {
  signature: string;
  signer: string;
}

export interface OrderResponse {
  orderID: string;
  status: string;
  error?: string;
}

export interface Position {
  asset_id: string;
  market: string;
  size: number;
  value: number;
  side: 'YES' | 'NO';
}

export interface OpenOrder {
  id: string;
  market: string;
  asset_id: string;
  price: number;
  size: number;
  size_matched: number;
  side: 'BUY' | 'SELL';
  outcome: 'YES' | 'NO';
  created_at: string;
}

/**
 * Get user's open orders
 */
export async function getOpenOrders(address: string): Promise<OpenOrder[]> {
  try {
    const response = await fetch(`${CLOB_API_BASE}/orders?address=${address}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch orders: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.orders || [];
  } catch (error) {
    console.error('Error fetching open orders:', error);
    return [];
  }
}

/**
 * Get user's positions
 */
export async function getPositions(address: string): Promise<Position[]> {
  try {
    const response = await fetch(`${CLOB_API_BASE}/positions?address=${address}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch positions: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.positions || [];
  } catch (error) {
    console.error('Error fetching positions:', error);
    return [];
  }
}

/**
 * Place an order on Polymarket
 * Note: Order must be signed using EIP-712 signature
 */
export async function placeOrder(signedOrder: SignedOrder): Promise<OrderResponse> {
  try {
    const response = await fetch(`${CLOB_API_BASE}/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(signedOrder),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to place order');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error placing order:', error);
    throw error;
  }
}

/**
 * Cancel an order
 */
export async function cancelOrder(orderId: string, signature: string): Promise<boolean> {
  try {
    const response = await fetch(`${CLOB_API_BASE}/order/${orderId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ signature }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error canceling order:', error);
    return false;
  }
}

/**
 * Get order book for a token
 */
export async function getOrderBook(tokenId: string) {
  try {
    const response = await fetch(`${CLOB_API_BASE}/book?token_id=${tokenId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch order book');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching order book:', error);
    return null;
  }
}


