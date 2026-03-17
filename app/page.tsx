'use client';
import { useState, useEffect, useCallback } from 'react';
import { Relance, Prospect, WeekStats } from '@/lib/types';
import { parseISO, format, startOfWeek, endOfWeek } from 'date-fns';
import { isUrgent } from '@/lib/utils';

const DAYS = [
  { key: 'lundi' as const, label: 'L', full: 'Lundi' },
  { key: 'mardi' as const, label: 'M', full: 'Mardi' },
  { key: 'mercredi' as const, label: 'M', full: 'Mercredi' },
  { key: 'jeudi' as const, label: 'J', full: 'Jeudi' },
  { key: 'vendredi' as const, label: 'V', full: 'Vendredi' },
  { key: 'samedi' as const, label: 'S', full: 'Samedi' },
  { key: 'dimanche' as const, label: 'D', full: 'Dimanche' },
];

export default function DashboardPage() {
  const [relances, setRelances] = useState<Relance[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [stats, setStats] = useState<WeekStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [syncError, setSyncError] = useState(false);

  const fetchData = useCallback(async () => {
    const [rRes, pRes, sRes] = await Promise.all([
      fetch('/api/relances'),
      fetch('/api/prospects'),
      fetch('/api/stats'),
    ]);
    const [r, p, s] = await Promise.all([rRes.json(), pRes.json(), sRes.json()]);
    setRelances(r);
    setProspects(p);
    setStats(s);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const urgentRelances = relances.filter(isUrgent);

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const r1Week = prospects.filter((p) => {
    if (!p.date_r1) return false;
    try { const d = parseISO(p.date_r1); return d >= weekStart && d <= weekEnd; } catch { return false; }
  }).length;

  const r2Week = prospects.filter((p) => {
    if (!p.date_r2) return false;
    try { const d = parseISO(p.date_r2); return d >= weekStart && d <= weekEnd; } catch { return false; }
  }).length;

  const withR1 = prospects.filter((p) => p.date_r1).length;
  const withR2 = prospects.filter((p) => p.date_r2).length;
  const signed = prospects.filter((p) => p.decision === 'Signé').length;
  const tauxR1R2 = withR1 > 0 ? Math.round((withR2 / withR1) * 100) : 0;
  const tauxClosing = withR2 > 0 ? Math.round((signed / withR2) * 100) : 0;

  async function markDone(r: Relance) {
    await fetch('/api/relances', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: r.id, data: { ...r, statut: 'Faite' } }),
    });
    fetchData();
  }

  async function syncCalendar() {
    setSyncing(true);
    setSyncMsg('');
    setSyncError(false);
    try {
      const res = await fetch('/api/calendar');
      const data = await res.json();
      if (!res.ok || data.error) {
        setSyncError(true);
        setSyncMsg(data.error || 'Erreur de synchronisation');
      } else {
        setSyncMsg(data.message || 'Synchronisé');
        fetchData();
      }
    } catch {
      setSyncError(true);
      setSyncMsg('Erreur réseau');
    } finally {
      setSyncing(false);
      setTimeout(() => { setSyncMsg(''); setSyncError(false); }, 8000);
    }
  }

  async function updateStats(newStats: WeekStats) {
    setStats(newStats);
    await fetch('/api/stats', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newStats),
    });
  }

  const postsCount = stats ? DAYS.filter((d) => stats[d.key]).length : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-brand-blue font-heading font-semibold animate-pulse">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="p-6 pb-24 md:pb-10 max-w-6xl mx-auto space-y-6">

      {/* Alert banner */}
      {urgentRelances.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs font-bold">!</span>
            <h2 className="font-heading font-bold text-red-700 text-sm">
              {urgentRelances.length} relance{urgentRelances.length > 1 ? 's' : ''} urgente{urgentRelances.length > 1 ? 's' : ''}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {urgentRelances.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 bg-white rounded-xl px-4 py-3 border border-red-100">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{r.nom}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">{r.type_relance}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{format(parseISO(r.date_relance), 'dd/MM/yyyy')}{r.note_relance && ` — ${r.note_relance}`}</p>
                </div>
                <button onClick={() => markDone(r)} className="shrink-0 px-3 py-1.5 bg-brand-green text-white text-xs font-semibold rounded-lg hover:bg-brand-green-dark transition-colors">
                  ✓ Fait
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sync error */}
      {syncMsg && syncError && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-amber-700 text-sm font-semibold mb-1">Synchronisation impossible</p>
          <p className="text-amber-600 text-xs mb-1">{syncMsg}</p>
          <p className="text-gray-500 text-xs">
            Google Calendar → ⚙️ Paramètres → ton calendrier → <span className="font-medium text-gray-700">"Adresse secrète au format iCal"</span> → colle l'URL dans <code className="bg-gray-100 px-1 rounded text-[11px]">.env.local</code>
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Semaine du {format(weekStart, 'dd/MM')} au {format(weekEnd, 'dd/MM/yyyy')}</p>
        </div>
        <div className="flex items-center gap-3 pt-1">
          {syncMsg && !syncError && <span className="text-sm text-brand-green font-semibold">{syncMsg}</span>}
          <button
            onClick={syncCalendar}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white text-sm font-semibold rounded-xl hover:bg-brand-blue-dark transition-colors disabled:opacity-60 shadow-sm"
          >
            <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {syncing ? 'Sync...' : 'Sync Calendar'}
          </button>
        </div>
      </div>

      {/* KPI Cards — 4 colonnes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'R1 cette semaine', value: r1Week, accent: 'blue', sub: `${withR1} au total` },
          { label: 'R2 cette semaine', value: r2Week, accent: 'green', sub: `${withR2} au total` },
          { label: 'Taux R1 → R2', value: `${tauxR1R2}%`, accent: 'blue', sub: `${withR1} → ${withR2}` },
          { label: 'Taux de closing', value: `${tauxClosing}%`, accent: 'green', sub: `${signed} signé${signed > 1 ? 's' : ''}` },
        ].map((kpi) => (
          <div key={kpi.label} className={`bg-white rounded-2xl border p-5 shadow-sm ${kpi.accent === 'blue' ? 'border-blue-100' : 'border-green-100'}`}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{kpi.label}</p>
            <p className={`font-heading text-3xl font-bold ${kpi.accent === 'blue' ? 'text-brand-blue' : 'text-brand-green'}`}>{kpi.value}</p>
            <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* 2 colonnes : Instagram + Stats rapides */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Instagram tracker — 2/3 */}
        {stats && (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-heading font-bold text-gray-900 text-lg">Posts Instagram</h2>
                <p className="text-xs text-gray-400 mt-0.5">Cette semaine</p>
              </div>
              <span className={`text-sm font-bold px-3 py-1 rounded-full ${postsCount >= 5 ? 'bg-brand-green-light text-brand-green' : 'bg-gray-100 text-gray-600'}`}>
                {postsCount}/7
              </span>
            </div>
            <div className="flex gap-2 mb-5">
              {DAYS.map((day) => (
                <button
                  key={day.key}
                  title={day.full}
                  onClick={() => updateStats({ ...stats, [day.key]: !stats[day.key] })}
                  className={`flex-1 py-4 rounded-xl font-heading font-bold text-sm transition-all ${
                    stats[day.key]
                      ? 'bg-brand-green text-white shadow-sm'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              <label className="text-sm text-gray-600 font-medium">Messages reçus :</label>
              <input
                type="number"
                min="0"
                value={stats.messages_recus}
                onChange={(e) => updateStats({ ...stats, messages_recus: parseInt(e.target.value) || 0 })}
                className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
              />
            </div>
          </div>
        )}

        {/* Stats rapides — 1/3 */}
        <div className="flex flex-col gap-4">
          {[
            { label: 'Prospects total', value: prospects.length, color: 'blue' },
            { label: 'Clients signés', value: signed, color: 'green' },
            { label: 'Relances urgentes', value: urgentRelances.length, color: urgentRelances.length > 0 ? 'red' : 'gray' },
          ].map((s) => (
            <div key={s.label} className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-heading font-bold shrink-0 ${
                s.color === 'blue' ? 'bg-brand-blue-light text-brand-blue' :
                s.color === 'green' ? 'bg-brand-green-light text-brand-green' :
                s.color === 'red' ? 'bg-red-50 text-red-600' :
                'bg-gray-100 text-gray-500'
              }`}>
                {s.value}
              </div>
              <p className="text-sm font-medium text-gray-600 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
