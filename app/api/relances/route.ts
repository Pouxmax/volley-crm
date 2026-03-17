import { NextRequest, NextResponse } from 'next/server';
import { readJson, writeJson } from '@/lib/db';
import { Relance } from '@/lib/types';

const FILE = 'relances.json';

function makeId(items: Array<{ id: string }>): string {
  if (items.length === 0) return '1';
  return String(Math.max(...items.map((i) => parseInt(i.id, 10) || 0)) + 1);
}

export async function GET() {
  const relances = await readJson<Relance[]>(FILE, []);
  return NextResponse.json(relances);
}

export async function POST(request: NextRequest) {
  const data = await request.json();
  const relances = await readJson<Relance[]>(FILE, []);
  const newRelance: Relance = {
    id: makeId(relances),
    rowIndex: 0,
    nom: data.nom || '',
    date_relance: data.date_relance || '',
    type_relance: data.type_relance || 'Custom',
    statut: 'À faire',
    note_relance: data.note_relance || '',
    source: data.source || '',
  };
  relances.push(newRelance);
  await writeJson(FILE, relances);
  return NextResponse.json(newRelance);
}

export async function PUT(request: NextRequest) {
  const { id, data } = await request.json();
  const relances = await readJson<Relance[]>(FILE, []);
  const idx = relances.findIndex((r) => r.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  relances[idx] = { ...relances[idx], ...data };
  await writeJson(FILE, relances);

  // When marked as "Faite", activate next in sequence
  if (data.statut === 'Faite') {
    const sequence: Record<string, string> = { 'J+3': 'J+7', 'J+7': 'J+45' };
    const nextType = sequence[relances[idx].type_relance];
    if (nextType) {
      const nextIdx = relances.findIndex(
        (r) => r.nom?.toLowerCase() === relances[idx].nom?.toLowerCase() && r.type_relance === nextType
      );
      if (nextIdx !== -1) {
        relances[nextIdx] = { ...relances[nextIdx], statut: 'À faire' };
        await writeJson(FILE, relances);
      }
    }
  }

  return NextResponse.json({ success: true });
}
