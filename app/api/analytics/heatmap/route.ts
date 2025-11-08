import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      include: {
        performancePoints: {
          orderBy: { timestamp: 'asc' }
        },
        trades: {
          orderBy: { timestamp: 'asc' }
        }
      }
    });

    const heatmapData = agents.map(agent => {
      // Group performance by day and hour
      const dailyPerformance: Record<string, {
        gains: number,
        losses: number,
        total: number,
        percentChange: number,
        startValue: number,
        endValue: number
      }> = {};
      const hourlyActivity: Record<number, number> = {};
      const dayOfWeekActivity: Record<number, number> = {};

      // Calculate daily performance changes
      for (let i = 1; i < agent.performancePoints.length; i++) {
        const current = agent.performancePoints[i];
        const previous = agent.performancePoints[i - 1];
        const date = new Date(current.timestamp).toISOString().split('T')[0];
        const hour = new Date(current.timestamp).getHours();
        const dayOfWeek = new Date(current.timestamp).getDay();

        const change = current.accountValue - previous.accountValue;
        const percentChange = (change / previous.accountValue) * 100;

        if (!dailyPerformance[date]) {
          dailyPerformance[date] = {
            gains: 0,
            losses: 0,
            total: 0,
            percentChange: 0,
            startValue: previous.accountValue,
            endValue: current.accountValue
          };
        }

        if (change > 0) {
          dailyPerformance[date].gains += change;
        } else if (change < 0) {
          dailyPerformance[date].losses += Math.abs(change);
        }
        dailyPerformance[date].total += change;
        dailyPerformance[date].endValue = current.accountValue;

        // Track hourly activity
        hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
        dayOfWeekActivity[dayOfWeek] = (dayOfWeekActivity[dayOfWeek] || 0) + 1;
      }

      // Calculate percentage change for each day
      Object.keys(dailyPerformance).forEach(date => {
        const day = dailyPerformance[date];
        day.percentChange = ((day.endValue - day.startValue) / day.startValue) * 100;
      });

      // Calculate trade patterns
      const tradesByHour: Record<number, { count: number, wins: number, losses: number }> = {};
      const tradesByDayOfWeek: Record<number, { count: number, wins: number, losses: number }> = {};

      agent.trades.forEach(trade => {
        const hour = new Date(trade.timestamp).getHours();
        const dayOfWeek = new Date(trade.timestamp).getDay();

        if (!tradesByHour[hour]) {
          tradesByHour[hour] = { count: 0, wins: 0, losses: 0 };
        }
        tradesByHour[hour].count++;
        if (trade.realizedPnL && trade.realizedPnL > 0) tradesByHour[hour].wins++;
        if (trade.realizedPnL && trade.realizedPnL < 0) tradesByHour[hour].losses++;

        if (!tradesByDayOfWeek[dayOfWeek]) {
          tradesByDayOfWeek[dayOfWeek] = { count: 0, wins: 0, losses: 0 };
        }
        tradesByDayOfWeek[dayOfWeek].count++;
        if (trade.realizedPnL && trade.realizedPnL > 0) tradesByDayOfWeek[dayOfWeek].wins++;
        if (trade.realizedPnL && trade.realizedPnL < 0) tradesByDayOfWeek[dayOfWeek].losses++;
      });

      // Calculate win/loss streaks
      const streaks: Array<{ type: 'win' | 'loss', length: number, startDate: Date }> = [];
      let currentStreak: { type: 'win' | 'loss' | null, length: number, startDate: Date | null } = { type: null, length: 0, startDate: null };

      agent.trades
        .filter(t => t.realizedPnL !== null)
        .forEach(trade => {
          const isWin = (trade.realizedPnL || 0) > 0;
          const streakType = isWin ? 'win' : 'loss';

          if (currentStreak.type === streakType) {
            currentStreak.length++;
          } else {
            if (currentStreak.type !== null && currentStreak.length > 0) {
              streaks.push({
                type: currentStreak.type,
                length: currentStreak.length,
                startDate: currentStreak.startDate!
              });
            }
            currentStreak = { type: streakType, length: 1, startDate: trade.timestamp };
          }
        });

      // Add final streak
      if (currentStreak.type !== null && currentStreak.length > 0) {
        streaks.push({
          type: currentStreak.type,
          length: currentStreak.length,
          startDate: currentStreak.startDate!
        });
      }

      const maxWinStreak = Math.max(...streaks.filter(s => s.type === 'win').map(s => s.length), 0);
      const maxLossStreak = Math.max(...streaks.filter(s => s.type === 'loss').map(s => s.length), 0);

      return {
        agentId: agent.id,
        name: agent.name,
        model: agent.model,
        color: agent.color,
        dailyPerformance,
        hourlyActivity,
        dayOfWeekActivity,
        tradesByHour,
        tradesByDayOfWeek,
        streaks,
        maxWinStreak,
        maxLossStreak
      };
    });

    return NextResponse.json(heatmapData);
  } catch (error: any) {
    console.error('Error fetching heatmap data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch heatmap data' },
      { status: 500 }
    );
  }
}
