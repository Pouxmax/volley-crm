import { NextRequest, NextResponse } from 'next/server';
import { readJson, writeJson } from '@/lib/db';
import { addDays, format, parseISO } from 'date-fns';
import { Prospect, Relance } from '@/lib/types';

const FILE = 'prospects.json';

function makeId(items: Array<{ id: string }>): string {
  if (items.length === 0) return '1';
  return String(Math.max(...items.map((i) => parseInt(i.id, 10) || 0)) + 1);
}

export async function GET() {
  const prospects = await readJson<Prospect[]>(FILE, []);
  return NextResponse.json(prospects);
}

export async function POST(request: NextRequest) {
  const data = await request.json();
  const prospects = await readJson<Prospect[]>(FILE, []);
  const newProspect: Prospect = {
    id: makeId(prospects),
    rowIndex: prospects.length + 2,
    nom: data.nom || '',
    source: data.source || '',
    niveau: data.niveau || '',
    poste: data.poste || '',
    blessure: data.blessure || '',
    objectif: data.objectif || '',
    temps_semaine: data.temps_semaine || '',
    anecdotes_r2: data.anecdotes_r2 || '',
    date_r1: data.date_r1 || '',
    date_r2: data.date_r2 || '',
    decision: data.decision || '',
    objection: data.objection || '',
    notes_r2: data.notes_r2 || '',
  };
  prospects.push(newProspect);
  await writeJson(FILE, prospects);
  return NextResponse.json(newProspect);
}

export async function PUT(request: NextRequest) {
  const { id, data, previousData } = await request.json();
  const prospects = await readJson<Prospect[]>(FILE, []);
  const idx = prospects.findIndex((p) => p.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  prospects[idx] = { ...prospects[idx], ...data };
  await writeJson(FILE, prospects);

  // Auto-create relances if Date_R2 was just set for the first time
  if (data.date_r2 && !previousData?.date_r2) {
    const relances = await readJson<Relance[]>('relances.json', []);
    const hasAuto = relances.some(
      (r) =>
        r.nom?.toLowerCase() === data.nom?.toLowerCase() &&
        ['J+3', 'J+7', 'J+45'].includes(r.type_relance)
    );
    if (!hasAuto) {
      const base = parseISO(data.date_r2);
      let maxId = relances.length === 0 ? 0 : Math.max(...relances.map((r) => parseInt(r.id, 10) || 0));
      const toAdd: Relance[] = [
        { id: String(++maxId), rowIndex: 0, nom: data.nom, date_relance: format(addDays(base, 3), 'yyyy-MM-dd'), type_relance: 'J+3', statut: 'À faire', note_relance: '', source: data.source || '' },
        { id: String(++maxId), rowIndex: 0, nom: data.nom, date_relance: format(addDays(base, 7), 'yyyy-MM-dd'), type_relance: 'J+7', statut: 'En attente', note_relance: '', source: data.source || '' },
        { id: String(++maxId), rowIndex: 0, nom: data.nom, date_relance: format(addDays(base, 45), 'yyyy-MM-dd'), type_relance: 'J+45', statut: 'En attente', note_relance: '', source: data.source || '' },
      ];
      await writeJson('relances.json', [...relances, ...toAdd]);
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  const prospects = await readJson<Prospect[]>(FILE, []);
  const prospect = prospects.find((p) => p.id === id);
  if (!prospect) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Also delete associated relances
  const relances = await readJson<Relance[]>('relances.json', []);
  const filtered = relances.filter((r) => r.nom?.toLowerCase() !== prospect.nom?.toLowerCase());
  await writeJson('relances.json', filtered);

  await writeJson(FILE, prospects.filter((p) => p.id !== id));
  return NextResponse.json({ success: true });
}
