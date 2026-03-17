'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Prospect, Relance } from '@/lib/types';
import { formatDate } from '@/lib/utils';

const NIVEAUX = ['Loisir', 'Departemental', 'Regional', 'Pré national', 'N3', 'N2', 'N1', 'Pro B', 'Pro A', 'Selection Nationale'];

const TYPE_COLORS: Record<string, string> = {
  'J+3': 'bg-amber-100 text-amber-700',
  'J+7': 'bg-blue-100 text-brand-blue',
  'J+45': 'bg-purple-100 text-purple-700',
  'Custom': 'bg-gray-100 text-gray-600',
};

export default function ProspectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const prospectId = params.id as string;

  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [relances, setRelances] = useState<Relance[]>([]);
  const [tab, setTab] = useState<'r1' | 'r2' | 'relances'>('r1');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<Partial<Prospect>>({});
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchData = useCallback(async () => {
    const [pRes, rRes] = await Promise.all([fetch('/api/prospects'), fetch('/api/relances')]);
    const [allProspects, allRelances]: [Prospect[], Relance[]] = await Promise.all([pRes.json(), rRes.json()]);
    const found = allProspects.find((p) => p.id === prospectId);
    if (found) { setProspect(found); setForm(found); }
    setRelances(allRelances.filter((r) => r.nom?.toLowerCase() === found?.nom?.toLowerCase()));
    setLoading(false);
  }, [prospectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function update(field: keyof Prospect, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function save() {
    if (!prospect) return;
    setSaving(true);
    await fetch('/api/prospects', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: prospectId, data: form, previousData: prospect }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    fetchData();
  }

  async function deleteProspect() {
    await fetch('/api/prospects', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: prospectId }),
    });
    router.push('/prospects');
  }

  async function addCustomRelance(e: React.FormEvent) {
    e.preventDefault();
    if (!customDate || !prospect) return;
    await fetch('/api/relances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom: prospect.nom, date_relance: customDate, type_relance: 'Custom', note_relance: customNote, source: prospect.source }),
    });
    setCustomDate(''); setCustomNote(''); setShowCustomForm(false);
    fetchData();
  }

  async function markRelanceDone(r: Relance) {
    await fetch('/api/relances', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: r.id, data: { ...r, statut: 'Faite' } }),
    });
    fetchData();
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-brand-blue font-heading animate-pulse">Chargement...</div></div>;

  if (!prospect) return (
    <div className="p-6 text-center text-gray-500">
      <p>Prospect introuvable</p>
      <button onClick={() => router.push('/prospects')} className="mt-3 text-brand-blue underline text-sm">Retour aux prospects</button>
    </div>
  );

  const autoRelances = relances.filter((r) => ['J+3', 'J+7', 'J+45'].includes(r.type_relance));
  const customRelances = relances.filter((r) => r.type_relance === 'Custom');

  return (
    <div className="p-6 pb-24 md:pb-10 max-w-3xl mx-auto">
      {/* Back + Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/prospects')} className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-bold text-gray-900">{prospect.nom}</h1>
          <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
            {prospect.source && <span className="font-semibold text-gray-600">{prospect.source}</span>}
            {prospect.niveau && <span>· {prospect.niveau}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-sm text-brand-green font-semibold">Enregistré ✓</span>}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            title="Supprimer ce prospect"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button onClick={save} disabled={saving} className="px-4 py-2.5 bg-brand-blue text-white text-sm font-semibold rounded-xl hover:bg-brand-blue-dark transition-colors disabled:opacity-60 shadow-sm">
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {(['r1', 'r2', 'relances'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'r1' ? 'R1 — Infos' : t === 'r2' ? 'R2 — Décision' : 'Relances'}
          </button>
        ))}
      </div>

      {/* R1 Tab */}
      {tab === 'r1' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Source">
              <select value={form.source || ''} onChange={(e) => update('source', e.target.value)} className="input-field">
                <option value="">—</option>
                <option>Instagram</option><option>YouTube</option><option>Référence</option>
              </select>
            </Field>
            <Field label="Niveau">
              <select value={form.niveau || ''} onChange={(e) => update('niveau', e.target.value)} className="input-field">
                <option value="">—</option>
                {NIVEAUX.map((n) => <option key={n}>{n}</option>)}
              </select>
            </Field>
            <Field label="Poste sur le terrain">
              <input type="text" value={form.poste || ''} onChange={(e) => update('poste', e.target.value)} placeholder="Ex: Libero, Pointu..." className="input-field" />
            </Field>
            <Field label="Temps/semaine disponible">
              <input type="text" value={form.temps_semaine || ''} onChange={(e) => update('temps_semaine', e.target.value)} placeholder="Ex: 3h/semaine" className="input-field" />
            </Field>
            <Field label="Date R1">
              <input type="date" value={form.date_r1 || ''} onChange={(e) => update('date_r1', e.target.value)} className="input-field" />
            </Field>
          </div>
          <Field label="Blessure(s)">
            <textarea value={form.blessure || ''} onChange={(e) => update('blessure', e.target.value)} placeholder="Décris les blessures actuelles ou passées..." rows={2} className="input-field resize-none" />
          </Field>
          <Field label="Objectif">
            <textarea value={form.objectif || ''} onChange={(e) => update('objectif', e.target.value)} placeholder="Quel est l'objectif principal du joueur ?" rows={2} className="input-field resize-none" />
          </Field>
          <Field label="Anecdotes à ressortir au R2">
            <textarea value={form.anecdotes_r2 || ''} onChange={(e) => update('anecdotes_r2', e.target.value)} placeholder="Points forts, éléments personnels à réutiliser au R2..." rows={3} className="input-field resize-none" />
          </Field>
        </div>
      )}

      {/* R2 Tab */}
      {tab === 'r2' && (
        <div className="space-y-4">
          {prospect.anecdotes_r2 && (
            <div className="bg-brand-blue-light border border-blue-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-brand-blue uppercase tracking-wide mb-2">Rappel — Anecdotes R1</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{prospect.anecdotes_r2}</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Date R2">
              <input type="date" value={form.date_r2 || ''} onChange={(e) => update('date_r2', e.target.value)} className="input-field" />
            </Field>
            <Field label="Décision finale">
              <select value={form.decision || ''} onChange={(e) => update('decision', e.target.value)} className="input-field">
                <option value="">—</option>
                <option>Signé</option><option>Réflexion</option><option>Refus</option>
              </select>
            </Field>
          </div>
          {(form.decision === 'Réflexion' || form.decision === 'Refus') && (
            <Field label="Type d'objection">
              <select value={form.objection || ''} onChange={(e) => update('objection', e.target.value)} className="input-field">
                <option value="">—</option>
                <option>Prix</option><option>Timing</option><option>Besoin non convaincu</option>
                <option>Autre engagement</option><option>Pas de réponse</option><option>Autre</option>
              </select>
            </Field>
          )}
          <Field label="Notes R2">
            <textarea value={form.notes_r2 || ''} onChange={(e) => update('notes_r2', e.target.value)} placeholder="Compte-rendu du rendez-vous, points clés..." rows={5} className="input-field resize-none" />
          </Field>
        </div>
      )}

      {/* Relances Tab */}
      {tab === 'relances' && (
        <div className="space-y-4">
          {!prospect.date_r2 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700">
              Les relances automatiques J+3 / J+7 / J+45 seront créées quand la Date R2 est renseignée.
            </div>
          )}
          {autoRelances.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Séquence automatique</h3>
              <div className="space-y-2">
                {autoRelances.map((r) => (
                  <div key={r.id} className={`flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 ${r.statut === 'Faite' ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${TYPE_COLORS[r.type_relance]}`}>{r.type_relance}</span>
                      <span className="text-sm text-gray-700 font-medium">{formatDate(r.date_relance)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.statut === 'Faite' ? 'bg-gray-100 text-gray-500' : r.statut === 'À faire' ? 'bg-brand-green-light text-brand-green' : 'bg-gray-100 text-gray-500'}`}>
                        {r.statut}
                      </span>
                    </div>
                    {r.statut === 'À faire' && (
                      <button onClick={() => markRelanceDone(r)} className="text-xs px-3 py-1.5 bg-brand-green text-white rounded-xl hover:bg-brand-green-dark font-semibold">✓ Fait</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {customRelances.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Relances personnalisées</h3>
              <div className="space-y-2">
                {customRelances.map((r) => (
                  <div key={r.id} className={`flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 ${r.statut === 'Faite' ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-semibold">Custom</span>
                      <span className="text-sm text-gray-700 font-medium">{formatDate(r.date_relance)}</span>
                      {r.note_relance && <span className="text-xs text-gray-400">— {r.note_relance}</span>}
                    </div>
                    {r.statut === 'À faire' && (
                      <button onClick={() => markRelanceDone(r)} className="text-xs px-3 py-1.5 bg-brand-green text-white rounded-xl hover:bg-brand-green-dark font-semibold">✓ Fait</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {!showCustomForm ? (
            <button onClick={() => setShowCustomForm(true)} className="w-full py-3 border-2 border-dashed border-gray-200 text-gray-400 text-sm font-semibold rounded-2xl hover:border-brand-blue hover:text-brand-blue transition-colors">
              + Ajouter une relance personnalisée
            </button>
          ) : (
            <form onSubmit={addCustomRelance} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-3">
              <h3 className="font-heading font-bold text-gray-900">Nouvelle relance</h3>
              <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} required className="input-field" />
              <input type="text" value={customNote} onChange={(e) => setCustomNote(e.target.value)} placeholder="Note (optionnel)" className="input-field" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowCustomForm(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50">Annuler</button>
                <button type="submit" className="flex-1 py-2.5 bg-brand-blue text-white text-sm font-semibold rounded-xl hover:bg-brand-blue-dark">Ajouter</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h2 className="font-heading font-bold text-xl text-gray-900 text-center mb-2">Supprimer ce prospect ?</h2>
            <p className="text-sm text-gray-500 text-center mb-1">
              <span className="font-semibold text-gray-700">{prospect.nom}</span> sera définitivement supprimé.
            </p>
            <p className="text-xs text-gray-400 text-center mb-6">Toutes ses relances associées seront également supprimées.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={deleteProspect}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}
