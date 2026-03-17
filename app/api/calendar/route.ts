import { NextResponse } from 'next/server';
import { readJson, writeJson } from '@/lib/db';
import { addDays, format, parseISO } from 'date-fns';
import { Prospect, Relance } from '@/lib/types';

// Parse an ICS datetime string to YYYY-MM-DD
function icsDateToYMD(val: string): string {
  // DATE format: 20250316
  // DATETIME format: 20250316T100000Z or 20250316T100000
  const s = val.replace(/T.*$/, '');
  if (s.length === 8) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }
  return '';
}

// Parse raw ICS text into a list of events with { summary, date }
function parseICS(ics: string): Array<{ summary: string; date: string }> {
  const events: Array<{ summary: string; date: string }> = [];
  const blocks = ics.split('BEGIN:VEVENT');
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const summaryMatch = block.match(/^SUMMARY[^:]*:(.+)$/m);
    const dtStartMatch = block.match(/^DTSTART[^:]*:(\S+)/m);
    if (!summaryMatch || !dtStartMatch) continue;
    const summary = summaryMatch[1].replace(/\\n/g, ' ').replace(/\\,/g, ',').trim();
    const date = icsDateToYMD(dtStartMatch[1].trim());
    if (summary && date) events.push({ summary, date });
  }
  return events;
}

function extractName(title: string, type: 'R1' | 'R2'): string | null {
  if (type === 'R1') {
    const m = title.match(/Visio 1 volley\s*\(([^)]+)\)/i) || title.match(/Visio 1 volley\s+(.+)$/i);
    return m ? m[1].trim() : null;
  } else {
    const m = title.match(/RDV 2\s*\(([^)]+)\)/i) || title.match(/RDV 2\s+(.+)$/i);
    return m ? m[1].trim() : null;
  }
}

function makeId(items: Array<{ id: string }>): string {
  if (items.length === 0) return '1';
  return String(Math.max(...items.map((i) => parseInt(i.id, 10) || 0)) + 1);
}

export async function GET() {
  const icsUrl = process.env.GOOGLE_CALENDAR_ICS_URL;

  if (!icsUrl) {
    return NextResponse.json({
      error: 'URL iCal non configurée — ajoute GOOGLE_CALENDAR_ICS_URL dans .env.local',
      synced: [],
    }, { status: 500 });
  }

  try {
    const res = await fetch(icsUrl, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({
        error: `Impossible de télécharger le calendrier (${res.status}) — vérifie l'URL iCal`,
        synced: [],
      }, { status: 500 });
    }

    const icsText = await res.text();
    const events = parseICS(icsText);

    const r1Events = events.filter((e) => e.summary.toLowerCase().includes('visio 1 volley'));
    const r2Events = events.filter((e) => e.summary.toLowerCase().includes('rdv 2'));

    let prospects = await readJson<Prospect[]>('prospects.json', []);
    const synced: Array<{ name: string; type: string; date: string; action: string }> = [];

    // Process R1
    for (const event of r1Events) {
      const name = extractName(event.summary, 'R1');
      if (!name || !event.date) continue;

      const existing = prospects.find((p) => p.nom.toLowerCase() === name.toLowerCase());
      if (existing) {
        if (!existing.date_r1) {
          existing.date_r1 = event.date;
          synced.push({ name, type: 'R1', date: event.date, action: 'updated' });
        }
      } else {
        const newP: Prospect = {
          id: makeId(prospects), rowIndex: 0, nom: name, source: '', niveau: '', poste: '',
          blessure: '', objectif: '', temps_semaine: '', anecdotes_r2: '',
          date_r1: event.date, date_r2: '', decision: '', objection: '', notes_r2: '',
        };
        prospects.push(newP);
        synced.push({ name, type: 'R1', date: event.date, action: 'created' });
      }
    }
    await writeJson('prospects.json', prospects);

    // Process R2
    for (const event of r2Events) {
      const name = extractName(event.summary, 'R2');
      if (!name || !event.date) continue;

      const existing = prospects.find((p) => p.nom.toLowerCase() === name.toLowerCase());
      if (!existing || existing.date_r2) continue;

      existing.date_r2 = event.date;
      synced.push({ name, type: 'R2', date: event.date, action: 'updated' });

      const relances = await readJson<Relance[]>('relances.json', []);
      const hasAuto = relances.some(
        (r) => r.nom?.toLowerCase() === name.toLowerCase() && ['J+3', 'J+7', 'J+45'].includes(r.type_relance)
      );
      if (!hasAuto) {
        const base = parseISO(event.date);
        let maxId = relances.length === 0 ? 0 : Math.max(...relances.map((r) => parseInt(r.id, 10) || 0));
        const toAdd: Relance[] = [
          { id: String(++maxId), rowIndex: 0, nom: name, date_relance: format(addDays(base, 3), 'yyyy-MM-dd'), type_relance: 'J+3', statut: 'À faire', note_relance: '', source: existing.source },
          { id: String(++maxId), rowIndex: 0, nom: name, date_relance: format(addDays(base, 7), 'yyyy-MM-dd'), type_relance: 'J+7', statut: 'En attente', note_relance: '', source: existing.source },
          { id: String(++maxId), rowIndex: 0, nom: name, date_relance: format(addDays(base, 45), 'yyyy-MM-dd'), type_relance: 'J+45', statut: 'En attente', note_relance: '', source: existing.source },
        ];
        await writeJson('relances.json', [...relances, ...toAdd]);
      }
    }
    await writeJson('prospects.json', prospects);

    return NextResponse.json({
      synced,
      message: synced.length > 0
        ? `${synced.length} événement(s) synchronisé(s)`
        : 'Calendrier synchronisé — aucun nouvel événement',
    });
  } catch (error) {
    console.error('Calendar sync error:', error);
    return NextResponse.json({
      error: 'Erreur lors de la synchronisation — vérifie l\'URL iCal dans .env.local',
      synced: [],
    }, { status: 500 });
  }
}
