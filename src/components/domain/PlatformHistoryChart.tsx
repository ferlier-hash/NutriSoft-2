import React, { useMemo, useState } from 'react';
import { BarChart3, Check, EyeOff, SlidersHorizontal } from 'lucide-react';
import { initialPlatformSnapshots } from '../../mocks/mockData';
import { formatCurrency } from '../../lib/adminCommercial';

type SeriesKey = 'activeOrganizations' | 'activePatients' | 'collectedRevenue';
type PeriodKey = 'current' | '3' | '6' | 'all' | 'custom';

const SERIES: Array<{ key: SeriesKey; label: string; shortLabel: string; color: string }> = [
  { key: 'activeOrganizations', label: 'Consultorios activos', shortLabel: 'Consultorios', color: '#0E7490' },
  { key: 'activePatients', label: 'Pacientes activos', shortLabel: 'Pacientes', color: '#6366F1' },
  { key: 'collectedRevenue', label: 'Cobros reales', shortLabel: 'Cobros', color: '#D97706' },
];

const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: 'current', label: 'Mes actual' },
  { key: '3', label: '3 meses' },
  { key: '6', label: '6 meses' },
  { key: 'all', label: 'Todo' },
  { key: 'custom', label: 'Personalizado' },
];

const FIRST_MONTH = initialPlatformSnapshots.at(0)?.month ?? '';
const LAST_MONTH = initialPlatformSnapshots.at(-1)?.month ?? '';
const monthLabel = (month: string) => new Date(`${month}-02T12:00:00`).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

export const PlatformHistoryChart: React.FC = () => {
  const [period, setPeriod] = useState<PeriodKey>('6');
  const [customStart, setCustomStart] = useState(initialPlatformSnapshots.at(-6)?.month ?? FIRST_MONTH);
  const [customEnd, setCustomEnd] = useState(LAST_MONTH);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({
    activeOrganizations: true,
    activePatients: true,
    collectedRevenue: true,
  });

  const data = useMemo(() => {
    if (period === 'current') return initialPlatformSnapshots.slice(-1);
    if (period === '3' || period === '6') return initialPlatformSnapshots.slice(-Number(period));
    if (period === 'custom') return initialPlatformSnapshots.filter(item => item.month >= customStart && item.month <= customEnd);
    return initialPlatformSnapshots;
  }, [customEnd, customStart, period]);
  const width = 760;
  const height = 230;
  const padding = { top: 24, right: 14, bottom: 36, left: 14 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const activeSeries = SERIES.filter(series => visible[series.key]);
  const hoveredSnapshot = hoveredIndex === null ? null : data[hoveredIndex];

  const normalizedY = (key: SeriesKey, value: number) => {
    const values = data.map(item => item[key]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(1, max - min);
    const normalized = (value - min) / range;
    return padding.top + plotHeight - (0.12 + normalized * 0.76) * plotHeight;
  };

  const xFor = (index: number) => padding.left + (index * plotWidth) / Math.max(1, data.length - 1);
  const pointsFor = (key: SeriesKey) => data.map((item, index) => `${xFor(index)},${normalizedY(key, item[key])}`).join(' ');

  const toggleSeries = (key: SeriesKey) => {
    setVisible(current => {
      const enabledCount = Object.values(current).filter(Boolean).length;
      if (current[key] && enabledCount === 1) return current;
      return { ...current, [key]: !current[key] };
    });
  };

  return (
    <section className="history-card" aria-labelledby="history-title">
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#0E7490]" />
            <h3 id="history-title" className="font-bold text-text-primary">Evolución de la plataforma</h3>
          </div>
          <p className="text-xs text-text-secondary mt-1">Cierres mensuales y cobros registrados en su fecha efectiva.</p>
        </div>

        <div className="history-period" aria-label="Período del gráfico">
          {PERIODS.map(option => (
            <button key={option.key} type="button" aria-pressed={period === option.key} onClick={() => { setPeriod(option.key); setHoveredIndex(null); }}>
              {option.key === 'custom' && <SlidersHorizontal className="w-3 h-3" />}
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {period === 'custom' && (
        <div className="history-custom-range" aria-label="Rango personalizado">
          <div>
            <label htmlFor="history-start-month">Desde</label>
            <select
              id="history-start-month"
              value={customStart}
              onChange={event => setCustomStart(event.target.value)}
            >
              {initialPlatformSnapshots.filter(item => item.month <= customEnd).map(item => <option key={item.month} value={item.month}>{monthLabel(item.month)}</option>)}
            </select>
          </div>
          <span>—</span>
          <div>
            <label htmlFor="history-end-month">Hasta</label>
            <select
              id="history-end-month"
              value={customEnd}
              onChange={event => setCustomEnd(event.target.value)}
            >
              {initialPlatformSnapshots.filter(item => item.month >= customStart).map(item => <option key={item.month} value={item.month}>{monthLabel(item.month)}</option>)}
            </select>
          </div>
          <p>{data.length} {data.length === 1 ? 'mes seleccionado' : 'meses seleccionados'}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-5" aria-label="Series visibles">
        {SERIES.map(series => (
          <button
            key={series.key}
            type="button"
            aria-pressed={visible[series.key]}
            onClick={() => toggleSeries(series.key)}
            className={`history-filter ${visible[series.key] ? 'history-filter--active' : ''}`}
            style={visible[series.key] ? { borderColor: series.color, backgroundColor: `${series.color}12`, color: series.color } : undefined}
          >
            <span className="history-filter__state" style={visible[series.key] ? { backgroundColor: series.color, borderColor: series.color } : undefined}>
              {visible[series.key] ? <Check className="w-3 h-3 text-white" /> : <EyeOff className="w-3 h-3" />}
            </span>
            {series.label}
          </button>
        ))}
      </div>

      <div className="relative mt-5 overflow-x-auto" onMouseLeave={() => setHoveredIndex(null)}>
        {hoveredSnapshot && hoveredIndex !== null && (
          <div
            className="history-tooltip"
            style={{ left: `${Math.min(86, Math.max(14, (hoveredIndex / Math.max(1, data.length - 1)) * 100))}%` }}
            role="status"
          >
            <p className="history-tooltip__month">{hoveredSnapshot.label} {hoveredSnapshot.month.slice(0, 4)}</p>
            <div className="space-y-2 mt-2">
              {activeSeries.map(series => (
                <div key={series.key} className="flex items-center justify-between gap-5">
                  <span className="flex items-center gap-2 text-[11px] text-[#66727D]"><i style={{ backgroundColor: series.color }} />{series.shortLabel}</span>
                  <strong className="text-xs text-[#151B22]">{series.key === 'collectedRevenue' ? formatCurrency(hoveredSnapshot[series.key]) : hoveredSnapshot[series.key].toLocaleString('es-AR')}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[620px] h-auto" role="img" aria-label="Gráfico histórico interactivo de consultorios, pacientes y cobros">
          <line x1={padding.left} x2={width - padding.right} y1={padding.top + plotHeight} y2={padding.top + plotHeight} stroke="#DDE4E5" />

          {SERIES.map(series => visible[series.key] && (
            <g key={series.key}>
              <polyline points={pointsFor(series.key)} fill="none" stroke={series.color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
              {data.map((item, index) => (
                <circle
                  key={`${series.key}-${item.month}`}
                  cx={xFor(index)}
                  cy={normalizedY(series.key, item[series.key])}
                  r={hoveredIndex === index ? 4.5 : 3}
                  fill="#FFFFFF"
                  stroke={series.color}
                  strokeWidth="2"
                  className="transition-all"
                />
              ))}
            </g>
          ))}

          {data.map((item, index) => {
            const slotWidth = plotWidth / Math.max(1, data.length - 1);
            return (
              <g
                key={item.month}
                role="button"
                tabIndex={0}
                aria-label={`Ver valores de ${item.label} ${item.month.slice(0, 4)}`}
                onMouseEnter={() => setHoveredIndex(index)}
                onFocus={() => setHoveredIndex(index)}
                onBlur={() => setHoveredIndex(null)}
              >
                <rect x={xFor(index) - slotWidth / 2} y={padding.top} width={slotWidth} height={plotHeight + 22} fill="transparent" />
                <text x={xFor(index)} y={height - 10} textAnchor="middle" fontSize="11" fill={hoveredIndex === index ? '#151B22' : '#7A858D'} fontWeight={hoveredIndex === index ? 700 : 500}>{item.label}</text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="text-[11px] text-text-tertiary mt-1">Pasá el cursor o usá el teclado sobre un mes para ver sus valores exactos.</p>
    </section>
  );
};
