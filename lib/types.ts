export interface Prospect {
  id: string;
  rowIndex: number;
  nom: string;
  source: 'Instagram' | 'YouTube' | 'Référence' | '';
  niveau: string;
  poste: string;
  blessure: string;
  objectif: string;
  temps_semaine: string;
  anecdotes_r2: string;
  date_r1: string;
  date_r2: string;
  decision: 'Signé' | 'Réflexion' | 'Refus' | '';
  objection: string;
  notes_r2: string;
}

export interface Relance {
  id: string;
  rowIndex: number;
  nom: string;
  date_relance: string;
  type_relance: 'J+3' | 'J+7' | 'J+45' | 'Custom';
  statut: 'À faire' | 'En attente' | 'Faite';
  note_relance: string;
  source: string;
}

export interface WeekStats {
  semaine: string;
  lundi: boolean;
  mardi: boolean;
  mercredi: boolean;
  jeudi: boolean;
  vendredi: boolean;
  samedi: boolean;
  dimanche: boolean;
  messages_recus: number;
}

export interface KPIData {
  funnel: {
    totalLeads: number;
    withR1: number;
    withR2: number;
    signed: number;
  };
  weeklyData: Array<{ week: string; r1: number; r2: number }>;
  sourceData: Array<{ name: string; value: number }>;
  postsThisMonth: number;
  rates: {
    r1ToR2: number;
    closing: number;
  };
}
