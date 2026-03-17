import { NextRequest, NextResponse } from 'next/server';
import { readJson, writeJson } from '@/lib/db';
import { format, startOfWeek } from 'date-fns';
import { WeekStats } from '@/lib/types';

const FILE = 'stats.json';

function getCurrentMonday(): string {
  return format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

const DEFAULT_WEEK = (): WeekStats => ({
  semaine: getCurrentMonday(),
  lundi: false, mardi: false, mercredi: false, jeudi: false,
  vendredi: false, samedi: false, dimanche: false,
  messages_recus: 0,
});

export async function GET() {
  const monday = getCurrentMonday();
  const stats = await readJson<WeekStats[]>(FILE, []);
  const current = stats.find((s) => s.semaine === monday) ?? DEFAULT_WEEK();
  return NextResponse.json(current);
}

export async function PUT(request: NextRequest) {
  const data: WeekStats = await request.json();
  const stats = await readJson<WeekStats[]>(FILE, []);
  const idx = stats.findIndex((s) => s.semaine === data.semaine);
  if (idx === -1) {
    stats.push(data);
  } else {
    stats[idx] = data;
  }
  await writeJson(FILE, stats);
  return NextResponse.json({ success: true });
}
