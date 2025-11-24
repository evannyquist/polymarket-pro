"use client";

interface SlugGenerationResult {
  slug: string;
  timestamp: number;
  periodStart: Date;
  periodEnd: Date;
  interval: string;
}

/**
 * Generate a slug for the current BTC 15-minute period
 * This is now simplified to only support BTC 15-minute markets
 */
export function generateCurrentBTC15MinSlug(): SlugGenerationResult {
  const now = Date.now();
  const periodLengthMs = 15 * 60 * 1000; // 15 minutes
  
  // Round down to the nearest 15-minute boundary
  const currentPeriodStart = Math.floor(now / periodLengthMs) * periodLengthMs;
  const currentPeriodStartSeconds = Math.floor(currentPeriodStart / 1000);
  
  // Format: btc-updown-15m-{unix_timestamp}
  const slug = `btc-updown-15m-${currentPeriodStartSeconds}`;
  
  return {
    slug,
    timestamp: currentPeriodStartSeconds,
    periodStart: new Date(currentPeriodStart),
    periodEnd: new Date(currentPeriodStart + periodLengthMs),
    interval: "15m"
  };
}

