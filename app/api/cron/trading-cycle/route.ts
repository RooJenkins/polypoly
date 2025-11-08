import { NextRequest, NextResponse } from 'next/server';
import { runTradingCycle } from '@/lib/trading-engine';

/**
 * POST /api/cron/trading-cycle
 * Vercel Cron Job endpoint to run the AI trading cycle
 * Runs every 30 minutes during market hours (9:00 AM - 4:30 PM ET)
 */
export async function POST(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization');

  if (process.env.NODE_ENV === 'production') {
    // In production, verify it's coming from Vercel Cron
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

  console.log('🚀 [Cron] Trading cycle triggered by Vercel Cron');

  try {
    await runTradingCycle();

    return NextResponse.json({
      success: true,
      message: 'Trading cycle completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ [Cron] Trading cycle failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Trading cycle failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/trading-cycle
 * GitHub Actions endpoint to trigger trading cycle
 */
export async function GET(request: NextRequest) {
  // Verify the request has the correct authorization
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  console.log('🚀 [Cron] Trading cycle triggered by GitHub Actions');

  try {
    await runTradingCycle();

    return NextResponse.json({
      success: true,
      message: 'Trading cycle completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ [Cron] Trading cycle failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Trading cycle failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
