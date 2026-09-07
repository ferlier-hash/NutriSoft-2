import { useEffect, useState } from 'react';
import { Building2, RefreshCw, ShieldCheck, Stethoscope, Users } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import type { RealAdminOverview } from '../../../data/admin-overview.types';
import { loadRealAdminOverview } from '../../../data/supabase/admin-overview.repository';
import { formatShortDate } from '../../../lib/dateUtils';

type ViewState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; data: RealAdminOverview };

export function RealAdminOverviewPage({
  loadOverview = loadRealAdminOverview,
}: {
  loadOverview?: () => Promise<RealAdminOverview>;
}) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ViewState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    void loadOverview()
      .then(data => active && setState({ status: 'success', data }))
      .catch(() => active && setState({ status: 'error' }));
    return () => { active = false; };
  }, [attempt, loadOverview]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-strong">Super Admin · Vista comercial</p>
        <h2 className="mt-2 text-3xl font-bold text-text-primary">Resumen real de plataforma</h2>
        <p className="mt-2 max-w-2xl text-sm text-text-secondary">Información administrativa obtenida desde Supabase local. Esta vista no consulta ni muestra información clínica.</p>
      </div>

      <section className="rounded-2xl border border-[#C6D4F8] bg-[#EAEFFC] p-4" aria-label="Privacidad por diseño">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#2D3F99]" aria-hidden="true" />
          <div><h3 className="text-sm font-semibold text-[#2D3F99]">Privacidad por diseño</h3><p className="mt-1 text-xs leading-5 text-text-secondary">El Platform Admin sólo recibe operación comercial y conteos agregados. Los datos clínicos permanecen fuera de este portal.</p></div>
        </div>
      </section>

      {state.status === 'loading' && (
        <div role="status" className="rounded-2xl border border-border-subtle bg-surface p-8 text-sm text-text-secondary">Cargando datos administrativos reales…</div>
      )}

      {state.status === 'error' && (
        <section role="alert" className="rounded-2xl border border-[#F8C4C1] bg-[#FCEBEA] p-5">
          <h3 className="font-semibold text-[#902A24]">No pudimos cargar el resumen</h3>
          <p className="mt-1 text-sm text-text-secondary">Revisá que Supabase local continúe activo e intentá nuevamente.</p>
          <Button type="button" variant="secondary" className="mt-4 gap-2" onClick={() => setAttempt(value => value + 1)}><RefreshCw className="w-4 h-4" aria-hidden="true" /> Reintentar</Button>
        </section>
      )}

      {state.status === 'success' && <AdminOverviewContent data={state.data} />}
    </div>
  );
}

function AdminOverviewContent({ data }: { data: RealAdminOverview }) {
  const cards = [
    { label: 'Consultorios activos', value: data.metrics.organizationsActive, note: `${data.metrics.organizationsTotal} registrados`, icon: Building2 },
    { label: 'Nutricionistas activos', value: data.metrics.nutritionistsTotal, note: 'Conteo agregado', icon: Stethoscope },
    { label: 'Pacientes activos', value: data.metrics.patientsTotal, note: 'Sólo conteo agregado', icon: Users },
  ];

  return (
    <>
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-label="Indicadores reales">
        {cards.map(({ label, value, note, icon: Icon }) => (
          <article key={label} className="rounded-2xl border border-border-subtle bg-surface p-5 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-brand-soft text-brand-strong flex items-center justify-center"><Icon className="w-5 h-5" aria-hidden="true" /></div>
            <p className="mt-5 text-sm text-text-secondary">{label}</p>
            <p className="mt-1 text-3xl font-bold text-text-primary">{value.toLocaleString('es-AR')}</p>
            <p className="mt-1 text-xs text-text-tertiary">{note}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm">
        <div className="border-b border-border-subtle p-5">
          <h3 className="font-semibold text-text-primary">Consultorios registrados</h3>
          <p className="mt-1 text-xs text-text-secondary">Directorio administrativo mínimo, ordenado alfabéticamente.</p>
        </div>
        {data.organizations.length === 0 ? (
          <div className="p-10 text-center"><Building2 className="mx-auto h-8 w-8 text-text-tertiary" aria-hidden="true" /><p className="mt-3 text-sm font-semibold text-text-primary">Todavía no hay consultorios</p><p className="mt-1 text-xs text-text-secondary">El alta real se habilitará cuando la invitación y la escritura transaccional estén conectadas.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left border-collapse">
              <thead className="bg-surface-subtle"><tr className="text-[11px] uppercase tracking-wide text-text-secondary"><th scope="col" className="table-cell-admin">Consultorio</th><th scope="col" className="table-cell-admin">Identificador</th><th scope="col" className="table-cell-admin">Estado</th><th scope="col" className="table-cell-admin">Registrado</th></tr></thead>
              <tbody className="divide-y divide-border-subtle text-xs">
                {data.organizations.map(organization => (
                  <tr key={organization.id}>
                    <td className="table-cell-admin font-semibold text-text-primary">{organization.name}</td>
                    <td className="table-cell-admin text-text-secondary">{organization.slug}</td>
                    <td className="table-cell-admin"><Badge variant={organization.status === 'active' ? 'active' : 'suspended'}>{organization.status === 'active' ? 'Activo' : 'Suspendido'}</Badge></td>
                    <td className="table-cell-admin text-text-secondary">{formatShortDate(organization.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
