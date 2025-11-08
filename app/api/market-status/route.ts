import { NextResponse } from 'next/server';
import { isMarketOpen, getMarketStatus as getStatus } from '@/lib/realistic-execution';

export async function GET() {
  try {
    const status = getStatus();

    return NextResponse.json({
      isOpen: status.isOpen,
      nextOpen: status.nextOpen.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/New_York',
        timeZoneName: 'short'
      }),
      currentTime: status.currentTime.toISOString()
    });
  } catch (error) {
    console.error('Error getting market status:', error);
    return NextResponse.json(
      { error: 'Failed to get market status' },
      { status: 500 }
    );
  }
}
