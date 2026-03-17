import { format, parseISO, isToday, isTomorrow, differenceInDays, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy');
  } catch {
    return dateStr;
  }
}

export function getRelanceBadge(dateStr: string): {
  label: string;
  color: 'red' | 'orange' | 'green' | 'blue';
} {
  if (!dateStr) return { label: 'N/A', color: 'blue' };
  try {
    const date = parseISO(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date <= today || isToday(date)) return { label: "Aujourd'hui", color: 'red' };
    if (isTomorrow(date)) return { label: 'Demain', color: 'orange' };

    const diff = differenceInDays(date, today);
    if (diff <= 7) return { label: `Dans ${diff}j`, color: 'green' };

    return { label: format(date, 'dd/MM', { locale: fr }), color: 'blue' };
  } catch {
    return { label: dateStr, color: 'blue' };
  }
}

export function isUrgent(relance: { date_relance: string; statut: string }): boolean {
  if (relance.statut !== 'À faire') return false;
  try {
    const date = parseISO(relance.date_relance);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date <= today;
  } catch {
    return false;
  }
}

export function getCurrentWeekMonday(): string {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  return format(monday, 'yyyy-MM-dd');
}

export function getProspectStatus(decision: string): {
  label: string;
  color: string;
} {
  if (decision === 'Signé') return { label: 'Signé', color: 'green' };
  if (decision === 'Refus') return { label: 'Refus', color: 'red' };
  return { label: 'En cours', color: 'blue' };
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
