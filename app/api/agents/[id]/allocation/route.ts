import { NextRequest, NextResponse } from 'next/server';
import { calculatePortfolioAllocation, getAllocationSummary } from '@/lib/portfolio-allocation';

/**
 * GET /api/agents/[id]/allocation
 *
 * Returns portfolio allocation breakdown by asset class
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id;

    // Calculate allocation
    const allocation = await calculatePortfolioAllocation(agentId);

    // Add summary text
    const summary = getAllocationSummary(allocation);

    return NextResponse.json({
      success: true,
      data: {
        ...allocation,
        summary,
      },
    });
  } catch (error: any) {
    console.error('Error fetching portfolio allocation:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
