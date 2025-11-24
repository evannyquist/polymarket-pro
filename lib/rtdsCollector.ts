"use client";

/**
 * RTDS Data Collector - Runs in the browser to collect real-time data
 * This connects to Polymarket's RTDS WebSocket and stores data in the database
 */

export class RTDSCollector {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isIntentionallyClosing = false;
  private currentTokenId: string | null = null;

  constructor(private tokenId?: string) {
    this.currentTokenId = tokenId || null;
  }

  async start() {
    this.isIntentionallyClosing = false;
    await this.connectCryptoPrice();
    if (this.currentTokenId) {
      await this.connectMarketPrice();
    }
  }

  stop() {
    this.isIntentionallyClosing = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.ws) {
      this.ws.close();
    }
  }

  setTokenId(tokenId: string) {
    this.currentTokenId = tokenId;
  }

  private async connectCryptoPrice() {
    try {
      const ws = new WebSocket("wss://ws-live-data.polymarket.com");

      ws.onopen = () => {
        console.log('[RTDSCollector] Connected to crypto_prices');
        
        const subscribeMessage = {
          action: "subscribe",
          subscriptions: [
            {
              topic: "crypto_prices",
              type: "update"
            }
          ]
        };
        
        ws.send(JSON.stringify(subscribeMessage));
      };

      ws.onmessage = async (event) => {
        try {
          if (!event.data || event.data.trim() === "") return;
          
          const data = JSON.parse(event.data);
          
          // Handle BTC/USDT price updates
          if (
            data.topic === "crypto_prices" &&
            data.type === "update" &&
            data.payload &&
            data.payload.symbol === "btcusdt" &&
            typeof data.payload.value === "number"
          ) {
            const price = data.payload.value;
            if (price > 0) {
              // Store in database via API
              await fetch('/api/rtds/collect-btc-price', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  price,
                  source: 'binance' // RTDS pipes from Binance
                })
              });
            }
          }
        } catch (err) {
          // Ignore parse errors
        }
      };

      ws.onerror = (error) => {
        console.error('[RTDSCollector] WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('[RTDSCollector] WebSocket closed');
        
        if (!this.isIntentionallyClosing) {
          this.reconnectTimeout = setTimeout(() => {
            this.connectCryptoPrice();
          }, 3000);
        }
      };

      this.ws = ws;
    } catch (err) {
      console.error('[RTDSCollector] Error connecting:', err);
      if (!this.isIntentionallyClosing) {
        this.reconnectTimeout = setTimeout(() => {
          this.connectCryptoPrice();
        }, 3000);
      }
    }
  }

  private async connectMarketPrice() {
    // For market prices, we'll use the existing polymarketFeed hook
    // which already handles CLOB WebSocket connections
    // This is just a placeholder for future implementation
  }
}

// Export a singleton instance
let collector: RTDSCollector | null = null;

export function startRTDSCollector(tokenId?: string) {
  if (!collector) {
    collector = new RTDSCollector(tokenId);
  }
  collector.start();
  return collector;
}

export function stopRTDSCollector() {
  if (collector) {
    collector.stop();
    collector = null;
  }
}

export function getRTDSCollector() {
  return collector;
}


