import { NextResponse } from 'next/server';
import { cleanupOldRecords } from '@/lib/db/queries';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Cleanup endpoint to remove records older than 24 hours
 * This should be called by a cron job (e.g., Vercel Cron)
 */
export async function POST() {
  try {
    await cleanupOldRecords();
    
    return NextResponse.json({
      success: true,
      message: 'Cleanup completed successfully'
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}


