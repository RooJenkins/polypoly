import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where = agentId ? { agentId } : {};

    const decisions = await prisma.decision.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        agent: {
          select: {
            name: true,
            color: true,
            model: true,
          },
        },
      },
    });

    return NextResponse.json(decisions);
  } catch (error: any) {
    console.error('Error fetching decisions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch decisions' },
      { status: 500 }
    );
  }
}
