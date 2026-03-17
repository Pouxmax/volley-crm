import { NextRequest, NextResponse } from 'next/server';
import { readJson, writeJson } from '@/lib/db';
import { Prospect, Relance, WeekStats } from '@/lib/types';

// GET /api/migration → exports all data as JSON (use locally to prepare migration)
export async function GET() {
  const [prospects, relances, stats] = await Promise.all([
    readJson<Prospect[]>('prospects.json', []),
    readJson<Relance[]>('relances.json', []),
    readJson<WeekStats>('stats.json', {} as WeekStats),
  ]);
  return NextResponse.json({ prospects, relances, stats });
}

// POST /api/migration → imports data into the database (use on Vercel to restore data)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { prospects, relances, stats } = body;

  if (!Array.isArray(prospects) || !Array.isArray(relances)) {
    return NextResponse.json({ error: 'Format invalide' }, { status: 400 });
  }

  await Promise.all([
    writeJson('prospects.json', prospects),
    writeJson('relances.json', relances),
    writeJson('stats.json', stats || {}),
  ]);

  return NextResponse.json({
    ok: true,
    message: `Importé : ${prospects.length} prospects, ${relances.length} relances`,
  });
}
