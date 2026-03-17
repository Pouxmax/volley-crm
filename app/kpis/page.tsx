'use client';
import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip as PTooltip,
} from 'recharts';
import { KPIData } from '@/lib/types';

const PIE_COLORS = ['#185FA5', '#1A7A56', '#f59e0b', '#8b5cf6', '#ef4444'];

export default function KPIsPage() {
  const [data, setData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/kpis').then((r) => r.json()).then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-brand-blue font-heading animate-pulse">Chargement...</div></div>;
  if (!data) return null;

  const { funnel, weeklyData, sourceData, postsThisMonth, rates } = data;

  const funnelSteps = [
    { label: 'Leads total', value: funnel.totalLeads, color: '#185FA5' },
    { label: 'R1 effectués', value: funnel.withR1, color: '#2563eb' },
    { label: 'R2 effectués', value: funnel.withR2, color: '#1A7A56' },
    { label: 'Signés', value: funnel.signed, color: '#16a34a' },
  ];

  return (
    <div className="p-6 pb-24 md:pb-10 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-gray-900">KPIs & Stats</h1>
        <p className="text-sm text-gray-500 mt-1">Vue d'ensemble de ton activité</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total prospects', value: funnel.totalLeads, color: 'blue' },
          { label: 'Taux R1 → R2', value: `${rates.r1ToR2}%`, color: 'blue' },
          { label: 'Taux de closing', value: `${rates.closing}%`, color: 'green' },
          { label: 'Posts ce mois', value: postsThisMonth, color: 'green' },
        ].map((k) => (
          <div key={k.label} className={`bg-white rounded-2xl border shadow-sm p-5 ${k.color === 'blue' ? 'border-blue-100' : 'border-green-100'}`}>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{k.label}</p>
            <p className={`font-heading text-3xl font-bold ${k.color === 'blue' ? 'text-brand-blue' : 'text-brand-green'}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Funnel + Bar chart côte à côte */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Funnel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-heading font-bold text-gray-900 text-lg mb-5">Entonnoir de conversion</h2>
          <div className="space-y-4">
            {funnelSteps.map((step) => {
              const maxVal = funnel.totalLeads || 1;
              const pct = Math.round((step.value / maxVal) * 100);
              return (
                <div key={step.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-600 font-medium">{step.label}</span>
                    <span className="font-heading font-bold" style={{ color: step.color }}>
                      {step.value} <span className="text-gray-400 font-normal text-xs">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-7 bg-gray-100 rounded-lg overflow-hidden">
                    <div className="h-full rounded-lg transition-all duration-500" style={{ width: `${Math.max(pct, step.value > 0 ? 4 : 0)}%`, backgroundColor: step.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weekly Bar Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-heading font-bold text-gray-900 text-lg mb-5">Calls par semaine</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} labelStyle={{ fontWeight: 600 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="r1" name="R1" fill="#185FA5" radius={[4, 4, 0, 0]} />
              <Bar dataKey="r2" name="R2" fill="#1A7A56" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Source pie + Posts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-heading font-bold text-gray-900 text-lg mb-5">Répartition des sources</h2>
          {sourceData.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Aucune donnée</p>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="55%" height={160}>
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                    {sourceData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <PTooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2.5">
                {sourceData.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-sm text-gray-600 flex-1">{s.name || 'Autre'}</span>
                    <span className="font-heading font-bold text-sm text-gray-900">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
          <h2 className="font-heading font-bold text-gray-900 text-lg mb-5">Posts Instagram</h2>
          <div className="flex-1 flex flex-col items-center justify-center">
            <p className="font-heading text-6xl font-bold text-brand-blue">{postsThisMonth}</p>
            <p className="text-sm text-gray-500 mt-2 font-medium">posts ce mois-ci</p>
            <p className="text-xs text-gray-400 mt-3">Objectif : 20 posts/mois</p>
            <div className="w-full mt-3 bg-gray-100 rounded-full h-3">
              <div className="bg-brand-blue h-3 rounded-full transition-all" style={{ width: `${Math.min((postsThisMonth / 20) * 100, 100)}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-1.5 font-medium">{Math.min(postsThisMonth, 20)}/20</p>
          </div>
        </div>
      </div>
    </div>
  );
}
