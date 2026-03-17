'use client';
import { useState, useEffect, useCallback } from 'react';
import { Relance } from '@/lib/types';
import { getRelanceBadge, isUrgent } from '@/lib/utils';
import { parseISO, format } from 'date-fns';

const TYPE_COLORS: Record<string, string> = {
  'J+3': 'bg-amber-100 text-amber-700',
  'J+7': 'bg-blue-100 text-brand-blue',
  'J+45': 'bg-purple-100 text-purple-700',
  'Custom': 'bg-gray-100 text-gray-600',
};

const SOURCE_COLORS: Record<string, string> = {
  'Instagram': 'bg-pink-100 text-pink-700',
  'YouTube': 'bg-red-100 text-red-700',
  'Référence': 'bg-green-100 text-brand-green',
};

const URGENCY_COLORS = {
  red: 'bg-red-100 text-red-700',
  orange: 'bg-orange-100 text-orange-700',
  green: 'bg-brand-green-light text-brand-green',
  blue: 'bg-blue-50 text-brand-blue',
};

export default function RelancesPage() {
  const [relances, setRelances] = useState<Relance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'urgent' | 'afaire'>('all');

  const fetchRelances = useCallback(async () => {
    const res = await fetch('/api/relances');
    const data = await res.json();
    setRelances(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRelances(); }, [fetchRelances]);

  async function markDone(r: Relance) {
    await fetch('/api/relances', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: r.id, data: { ...r, statut: 'Faite' } }),
    });
    fetchRelances();
  }

  const sorted = [...relances].sort((a, b) => {
    const aUrg = isUrgent(a) ? 0 : a.statut === 'À faire' ? 1 : a.statut === 'En attente' ? 2 : 3;
    const bUrg = isUrgent(b) ? 0 : b.statut === 'À faire' ? 1 : b.statut === 'En attente' ? 2 : 3;
    if (aUrg !== bUrg) return aUrg - bUrg;
    return (a.date_relance || '').localeCompare(b.date_relance || '');
  });

  const filtered = sorted.filter((r) => {
    if (filter === 'urgent') return isUrgent(r);
    if (filter === 'afaire') return r.statut === 'À faire' || r.statut === 'En attente';
    return true;
  });

  const urgentCount = relances.filter(isUrgent).length;
  const aFaireCount = relances.filter((r) => r.statut === 'À faire').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-brand-blue font-heading animate-pulse">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="p-6 pb-24 md:pb-10 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">Relances</h1>
          <p className="text-sm text-gray-500 mt-1">{relances.length} au total · {urgentCount} urgente{urgentCount > 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {([
          { key: 'all', label: `Toutes (${relances.length})` },
          { key: 'urgent', label: `Urgentes (${urgentCount})` },
          { key: 'afaire', label: `À faire (${aFaireCount})` },
        ] as const).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors shadow-sm ${
              filter === f.key
                ? 'bg-brand-blue text-white shadow-brand-blue/20'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-blue hover:text-brand-blue'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-3">✓</p>
            <p className="font-medium">Aucune relance dans cette catégorie</p>
          </div>
        )}
        {filtered.map((r) => {
          const urgent = isUrgent(r);
          const badge = getRelanceBadge(r.date_relance);
          return (
            <div
              key={r.id}
              className={`bg-white rounded-2xl border p-4 transition-shadow hover:shadow-md ${
                urgent ? 'border-red-200 shadow-sm' : r.statut === 'Faite' ? 'border-gray-100 opacity-50' : 'border-gray-100 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="font-heading font-bold text-gray-900">{r.nom}</span>
                    {r.source && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${SOURCE_COLORS[r.source] || 'bg-gray-100 text-gray-600'}`}>
                        {r.source}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${TYPE_COLORS[r.type_relance] || 'bg-gray-100 text-gray-600'}`}>
                      {r.type_relance}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${URGENCY_COLORS[badge.color]}`}>
                      {badge.label}
                    </span>
                    {r.statut === 'Faite' && <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">Faite</span>}
                    {r.statut === 'En attente' && <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">En attente</span>}
                  </div>
                  {r.note_relance && (
                    <p className="text-sm text-gray-500 mt-2 bg-gray-50 rounded-lg px-3 py-1.5">{r.note_relance}</p>
                  )}
                </div>
                {urgent && (
                  <button
                    onClick={() => markDone(r)}
                    className="shrink-0 px-4 py-2 bg-brand-green text-white text-sm font-semibold rounded-xl hover:bg-brand-green-dark transition-colors shadow-sm"
                  >
                    ✓ Marquer fait
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
