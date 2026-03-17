import { NextResponse } from 'next/server';
import { readJson } from '@/lib/db';
import { format, startOfWeek, subWeeks, parseISO } from 'date-fns';
import { Prospect, WeekStats } from '@/lib/types';

export async function GET() {
  const prospects = await readJson<Prospect[]>('prospects.json', []);
  const statsHistory = await readJson<WeekStats[]>('stats.json', []);

  const now = new Date();
  const totalLeads = prospects.length;
  const withR1 = prospects.filter((p) => p.date_r1).length;
  const withR2 = prospects.filter((p) => p.date_r2).length;
  const signed = prospects.filter((p) => p.decision === 'Signé').length;

  // Weekly data — last 8 weeks
  const weeklyData = Array.from({ length: 8 }, (_, i) => {
    const weekStart = startOfWeek(subWeeks(now, 7 - i), { weekStartsOn: 1 });
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const r1 = prospects.filter((p) => {
      if (!p.date_r1) return false;
      try { const d = parseISO(p.date_r1); return d >= weekStart && d <= weekEnd; } catch { return false; }
    }).length;

    const r2 = prospects.filter((p) => {
      if (!p.date_r2) return false;
      try { const d = parseISO(p.date_r2); return d >= weekStart && d <= weekEnd; } catch { return false; }
    }).length;

    return { week: `S${format(weekStart, 'dd/MM')}`, r1, r2 };
  });

  // Source breakdown
  const sourcesMap: Record<string, number> = {};
  prospects.forEach((p) => {
    const src = p.source || 'Autre';
    sourcesMap[src] = (sourcesMap[src] || 0) + 1;
  });
  const sourceData = Object.entries(sourcesMap).map(([name, value]) => ({ name, value }));

  // Instagram posts this month
  const currentMonthPrefix = format(now, 'yyyy-MM');
  let postsThisMonth = 0;
  statsHistory.forEach((s) => {
    if (s.semaine?.startsWith(currentMonthPrefix)) {
      ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].forEach((d) => {
        if (s[d as keyof WeekStats]) postsThisMonth++;
      });
    }
  });

  return NextResponse.json({
    funnel: { totalLeads, withR1, withR2, signed },
    weeklyData,
    sourceData,
    postsThisMonth,
    rates: {
      r1ToR2: withR1 > 0 ? Math.round((withR2 / withR1) * 100) : 0,
      closing: withR2 > 0 ? Math.round((signed / withR2) * 100) : 0,
    },
  });
}
