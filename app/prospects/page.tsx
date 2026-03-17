'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Prospect } from '@/lib/types';
import { getProspectStatus } from '@/lib/utils';

const SOURCE_COLORS: Record<string, string> = {
  'Instagram': 'bg-pink-100 text-pink-700',
  'YouTube': 'bg-red-100 text-red-700',
  'Référence': 'bg-green-100 text-brand-green',
};

const STATUS_COLORS = {
  green: 'bg-brand-green-light text-brand-green',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-brand-blue-light text-brand-blue',
};

export default function ProspectsPage() {
  const router = useRouter();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSource, setNewSource] = useState('');

  const fetchProspects = useCallback(async () => {
    const res = await fetch('/api/prospects');
    const data = await res.json();
    setProspects(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProspects(); }, [fetchProspects]);

  async function addProspect(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await fetch('/api/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom: newName, source: newSource }),
    });
    setNewName('');
    setNewSource('');
    setShowAddModal(false);
    fetchProspects();
  }

  const filtered = prospects.filter((p) => {
    const matchSearch = p.nom.toLowerCase().includes(search.toLowerCase());
    const { label } = getProspectStatus(p.decision);
    const matchStatus = statusFilter === 'all' || label === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    all: prospects.length,
    'En cours': prospects.filter((p) => getProspectStatus(p.decision).label === 'En cours').length,
    'Signé': prospects.filter((p) => p.decision === 'Signé').length,
    'Refus': prospects.filter((p) => p.decision === 'Refus').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-brand-blue font-heading animate-pulse">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="p-6 pb-24 md:pb-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">Prospects</h1>
          <p className="text-sm text-gray-500 mt-1">{prospects.length} prospects</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white text-sm font-semibold rounded-xl hover:bg-brand-blue-dark transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Rechercher un prospect..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
        />
      </div>

      {/* Status filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {(['all', 'En cours', 'Signé', 'Refus'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors shadow-sm ${
              statusFilter === s
                ? 'bg-brand-blue text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-blue hover:text-brand-blue'
            }`}
          >
            {s === 'all' ? `Tous (${counts.all})` : `${s} (${counts[s]})`}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-3">🏐</p>
            <p className="font-medium">Aucun prospect trouvé</p>
          </div>
        )}
        {filtered.map((p) => {
          const status = getProspectStatus(p.decision);
          return (
            <div
              key={p.id}
              onClick={() => router.push(`/prospects/${p.id}`)}
              className="bg-white rounded-2xl border border-gray-100 p-4 cursor-pointer hover:border-brand-blue/30 hover:shadow-md transition-all shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="font-heading font-bold text-gray-900">{p.nom}</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[status.color as keyof typeof STATUS_COLORS]}`}>
                      {status.label}
                    </span>
                    {p.source && (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${SOURCE_COLORS[p.source] || 'bg-gray-100 text-gray-500'}`}>
                        {p.source}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                    {p.niveau && <span>{p.niveau}</span>}
                    {p.poste && <span>· {p.poste}</span>}
                    {p.date_r1 && <span>· R1 : {p.date_r1}</span>}
                    {p.date_r2 && <span>· R2 : {p.date_r2}</span>}
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="font-heading font-bold text-xl text-gray-900 mb-5">Nouveau prospect</h2>
            <form onSubmit={addProspect} className="space-y-3">
              <input type="text" placeholder="Nom complet *" value={newName} onChange={(e) => setNewName(e.target.value)} required className="input-field" />
              <select value={newSource} onChange={(e) => setNewSource(e.target.value)} className="input-field text-gray-700">
                <option value="">Source (optionnel)</option>
                <option>Instagram</option>
                <option>YouTube</option>
                <option>Référence</option>
              </select>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                  Annuler
                </button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-brand-blue text-white text-sm font-semibold rounded-xl hover:bg-brand-blue-dark transition-colors">
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
