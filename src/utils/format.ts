import { createElement } from './dom';

export function isoShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

export function badgeFor(status: string | null | undefined): HTMLElement {
  let variant = 'neutral';
  let label = status || '—';
  if (status === 'success') { variant = 'ok'; label = 'verde'; }
  else if (status === 'failure') { variant = 'bad'; label = 'rojo'; }
  else if (status === 'cancelled' || status === 'skipped') { variant = 'neutral'; label = 'cancelado'; }
  else if (status === 'pending' || status === 'in_progress') { variant = 'pending'; label = 'en curso'; }
  return createElement('span', { class: `badge ${variant}` }, [label]);
}

export function gateStateLabel(state: string): string {
  const labels: Record<string, string> = {
    current: 'actual',
    pending: 'pendiente',
    passed: 'superada',
  };
  return labels[state] || state;
}

export const GATE_NAMES: Record<string, string> = {
  G0: 'Cimientos',
  G1: 'Servicios',
  G2: 'Drivers',
  G3: 'SMP + dinámico',
  G4: 'Hardware real',
  G5: 'Compatibilidad',
};
