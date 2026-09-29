import { isoShort, badgeFor, gateStateLabel, GATE_NAMES } from '../utils/format';
import { SOURCES } from '../data/sources';
import { RISKS } from '../data/risks';
import { initTypewriters } from './terminal-typewriter';
import { initScrollReveal } from './scroll-reveal';
import { createElement } from '../utils/dom';

const REPO = 'Soluciones-Alexendros/alignux';
const ISSUES_URL = `https://github.com/${REPO}/issues`;

interface StatusData {
  generated_at: string;
  data_fresh: boolean;
  last_good_at: string | null;
  phase_current: string;
  gates: Array<{ id: string; state: 'current' | 'pending' | 'passed' }>;
  tasks: {
    total: number;
    must: number;
    should: number;
    could: number;
    by_phase: Record<string, number>;
  };
  ci: {
    main: { status: string; last_run: string; url: string } | null;
    nightly: { status: string; last_run: string; url: string } | null;
    last_run: string | null;
  };
  milestones: Array<{ id: string; due: string; open: number; closed: number }>;
  risks_active: number;
  pin: { sel4: string; microkit: string; rust_sel4: string };
}

type Child = Node | string;

function byId(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function make<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: Child[] = []
): HTMLElementTagNameMap[K] {
  return createElement(tag, attrs, children);
}

function kv(key: string, value: Child): HTMLElement {
  const row = make('div', { class: 'kv' }, [make('span', { class: 'k' }, [key])]);
  if (typeof value === 'string') {
    row.append(make('span', { class: 'v' }, [value]));
  } else {
    row.append(value);
  }
  return row;
}

function renderFuentes(): void {
  const grid = byId('fuentes-grid');
  if (!grid) return;
  grid.replaceChildren(
    ...SOURCES.map(([title, url, desc]) =>
      make('a', { class: 'card-link', href: url, target: '_blank', rel: 'noopener', title: desc }, [
        make('h4', {}, [title]),
        make('p', { class: 'muted text-sm' }, [desc]),
      ])
    )
  );
}

function renderRisks(): void {
  const host = byId('riesgos-lista');
  if (!host) return;
  host.replaceChildren(
    make(
      'div',
      { class: 'grid g2 mt-3' },
      RISKS.map(([id, sev, title, desc]) =>
        make('div', { class: 'card' }, [
          make('h4', {}, [`${id} · ${title}`]),
          make('span', { class: `badge ${sev === 'high' ? 'bad' : 'neutral'}` }, [`severidad ${sev}`]),
          make('p', { class: 'muted text-sm mt-2' }, [desc]),
        ])
      )
    )
  );
}

function renderStatus(data: StatusData): void {
  const aviso = byId('aviso');
  const fresh = byId('footer-fresh');

  if (!data.data_fresh && aviso) {
    aviso.hidden = false;
    aviso.className = 'banner error';
    aviso.replaceChildren(
      make('strong', {}, ['Datos no disponibles.']),
      ' La API de GitHub no respondió en la última exportación. Última fecha con datos buenos: ',
      make('code', {}, [data.last_good_at ? isoShort(data.last_good_at) : 'nunca']),
      '.'
    );
  }

  if (fresh) fresh.textContent = `· última exportación ${isoShort(data.generated_at)}`;

  const pin = data.pin || ({} as Partial<StatusData['pin']>);
  const t = data.tasks || { total: 0, must: 0, should: 0, could: 0, by_phase: {} };

  const estadoEl = byId('estado-dinamico');
  if (estadoEl) {
    estadoEl.replaceChildren(
      make('h3', { class: 'reveal-up' }, ['Estado en vivo']),
      make('div', { class: 'grid g3 my-4' }, [
        make('div', { class: 'card reveal-up' }, [
          make('div', { class: 'stat' }, [String(data.phase_current || '—')]),
          make('div', { class: 'stat-label' }, ['fase actual']),
        ]),
        make('div', { class: 'card reveal-up' }, [
          make('div', { class: 'stat' }, [String(t.total || 0)]),
          make('div', { class: 'stat-label' }, ['tareas en backlog']),
        ]),
        make('div', { class: 'card reveal-up' }, [
          make('div', { class: 'stat' }, [String(data.risks_active != null ? data.risks_active : '—')]),
          make('div', { class: 'stat-label' }, ['riesgos activos']),
        ]),
      ]),
      make('div', { class: 'grid g2 mt-3' }, [
        make('div', { class: 'card reveal-up' }, [
          make('h4', {}, ['Pin congelado']),
          kv('seL4', pin.sel4 || '—'),
          kv('Microkit', pin.microkit || '—'),
          kv('rust-sel4', pin.rust_sel4 || '—'),
        ]),
        make('div', { class: 'card reveal-up' }, [
          make('h4', {}, ['CI']),
          kv('main', badgeFor(data.ci?.main?.status || null)),
          kv('nightly', badgeFor(data.ci?.nightly?.status || null)),
          kv('último run', isoShort(data.ci?.last_run || null)),
        ]),
      ]),
      make('p', { class: 'muted reveal-up mt-4' }, [
        'Verificado a fecha de ',
        make('code', {}, [isoShort(data.generated_at)]),
        '. El aseguramiento se comunica por plataforma y configuración; véase la pestaña ',
        make('em', {}, ['Fuentes']),
        '.',
      ])
    );
  }

  const roadmapEl = byId('roadmap-dinamico');
  if (roadmapEl) {
    roadmapEl.replaceChildren(
      ...(data.milestones || []).map((m) => {
        const tot = m.open + m.closed;
        const pct = tot > 0 ? Math.round((100 * m.closed) / tot) : 0;
        const cur = data.phase_current === m.id;
        const header = make('div', { class: 'between' }, [
          make('h4', {}, cur ? [m.id, ' ', make('span', { class: 'badge pending' }, ['actual'])] : [m.id]),
          make('span', { class: 'muted mono text-xs' }, [
            `${m.open} abiertas · ${m.closed} cerradas · vence ${m.due}`,
          ]),
        ]);
        const bar = make('div', { class: 'bar mt-2' });
        const fill = make('span');
        fill.style.width = `${pct}%`;
        bar.append(fill);
        return make(
          'a',
          {
            class: 'card-link reveal-up mb-3',
            href: `${ISSUES_URL}?q=milestone%3A%22${encodeURIComponent(m.id)}%22`,
            target: '_blank',
            rel: 'noopener',
          },
          [header, bar]
        );
      })
    );
  }

  const phases = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'S', 'V', 'CI', 'P'];
  const tareasEl = byId('tareas-dinamico');
  if (tareasEl) {
    tareasEl.replaceChildren(
      make('div', { class: 'grid g3 reveal-up my-4' }, [
        make('div', { class: 'card' }, [
          make('div', { class: 'stat' }, [String(t.must || 0)]),
          make('div', { class: 'stat-label' }, ['prio:must']),
        ]),
        make('div', { class: 'card' }, [
          make('div', { class: 'stat' }, [String(t.should || 0)]),
          make('div', { class: 'stat-label' }, ['prio:should']),
        ]),
        make('div', { class: 'card' }, [
          make('div', { class: 'stat' }, [String(t.could || 0)]),
          make('div', { class: 'stat-label' }, ['prio:could']),
        ]),
      ]),
      make('div', { class: 'card reveal-up' }, [
        make('h4', {}, ['Por fase']),
        ...phases.map((p) => kv(p, String((t.by_phase && t.by_phase[p]) || 0))),
      ])
    );
  }

  const gatesEl = byId('gates-dinamico');
  if (gatesEl) {
    gatesEl.replaceChildren(
      ...(data.gates || []).map((g) =>
        make('div', { class: 'gate reveal-up' }, [
          make('span', { class: `dot ${g.state || 'pending'}` }),
          make('div', {}, [
            make('strong', {}, [`${g.id} — ${GATE_NAMES[g.id] || ''}`]),
            ' ',
            make('span', { class: 'muted' }, [`(${gateStateLabel(g.state)})`]),
          ]),
        ])
      )
    );
  }

  const riesgosCountEl = byId('riesgos-dinamico');
  if (riesgosCountEl) {
    riesgosCountEl.replaceChildren(
      make('div', { class: 'card reveal-up my-4 inline-block' }, [
        make('div', { class: 'stat' }, [String(data.risks_active != null ? data.risks_active : '—')]),
        make('div', { class: 'stat-label' }, ['riesgos activos']),
      ])
    );
  }
}

async function load(): Promise<void> {
  renderFuentes();
  renderRisks();

  try {
    const res = await fetch('status.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as StatusData;
    renderStatus(data);
    initTypewriters();
    initScrollReveal();
  } catch {
    const aviso = byId('aviso');
    if (aviso) {
      aviso.hidden = false;
      aviso.className = 'banner error';
      aviso.replaceChildren(
        make('strong', {}, ['Datos no disponibles.']),
        ' No se pudo cargar ',
        make('code', {}, ['status.json']),
        '. El panel sigue siendo legible; los datos vivos volverán cuando se publique la exportación.'
      );
    }

    const fallbacks: Array<[string, string]> = [
      ['estado-dinamico', 'Sin datos vivos.'],
      ['roadmap-dinamico', 'Sin datos de milestones.'],
      ['tareas-dinamico', 'Sin contadores.'],
      ['gates-dinamico', 'Sin puertas.'],
    ];
    fallbacks.forEach(([id, msg]) => {
      const el = byId(id);
      if (el) el.replaceChildren(make('p', { class: 'muted' }, [msg]));
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', load);
} else {
  load();
}
