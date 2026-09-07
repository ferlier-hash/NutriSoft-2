import { useEffect, useMemo, useState } from 'react';
import { Building2, RefreshCw, Search } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import type { RealAdminOrganization } from '../../../data/admin-overview.types';
import { loadRealAdminOrganizations } from '../../../data/supabase/admin-overview.repository';
import { formatFullDateTime, formatShortDate } from '../../../lib/dateUtils';

type DirectoryState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; organizations: RealAdminOrganization[] };

type StatusFilter = 'all' | RealAdminOrganization['status'];

export function RealOrganizationsPage({
  loadOrganizations = loadRealAdminOrganizations,
}: {
  loadOrganizations?: () => Promise<RealAdminOrganization[]>;
}) {
  const [state, setState] = useState<DirectoryState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    void loadOrganizations()
      .then(organizations => active && setState({ status: 'success', organizations }))
      .catch(() => active && setState({ status: 'error' }));
    return () => { active = false; };
  }, [attempt, loadOrganizations]);

  const filtered = useMemo(() => {
    if (state.status !== 'success') return [];
    const query = search.trim().toLocaleLowerCase('es-AR');
    return state.organizations.filter(organization => {
      const matchesText = !query || organization.name.toLocaleLowerCase('es-AR').includes(query) || organization.slug.toLocaleLowerCase('es-AR').includes(query);
      const matchesStatus = statusFilter === 'all' || organization.status === statusFilter;
      return matchesText && matchesStatus;
    });
  }, [search, state, statusFilter]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-strong">Cuentas y acceso</p>
        <h2 className="mt-2 flex items-center gap-2 text-3xl font-bold text-text-primary"><Building2 className="h-7 w-7 text-brand-strong" aria-hidden="true" /> Consultorios registrados</h2>
        <p className="mt-2 text-sm text-text-secondary">Directorio administrativo real. Los planes, pagos y responsables todavía no están conectados.</p>
      </div>

      {state.status === 'loading' && <div role="status" className="rounded-2xl border border-border-subtle bg-surface p-8 text-sm text-text-secondary">Cargando consultorios reales…</div>}

      {state.status === 'error' && (
        <section role="alert" className="rounded-2xl border border-[#F8C4C1] bg-[#FCEBEA] p-5">
          <h3 className="font-semibold text-[#902A24]">No pudimos cargar los consultorios</h3>
          <p className="mt-1 text-sm text-text-secondary">La información no se modificó. Intentá nuevamente.</p>
          <Button type="button" variant="secondary" className="mt-4 gap-2" onClick={() => setAttempt(value => value + 1)}><RefreshCw className="h-4 w-4" aria-hidden="true" /> Reintentar</Button>
        </section>
      )}

      {state.status === 'success' && (
        <section className="overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border-subtle p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <label htmlFor="real-organization-search" className="sr-only">Buscar consultorio</label>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
              <input id="real-organization-search" value={search} onChange={event => setSearch(event.target.value)} className="form-control pl-11" placeholder="Buscar por nombre o identificador…" />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label htmlFor="real-organization-status" className="text-xs font-semibold text-text-secondary">Estado</label>
              <select id="real-organization-status" value={statusFilter} onChange={event => setStatusFilter(event.target.value as StatusFilter)} className="form-control sm:w-44">
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="suspended">Suspendidos</option>
              </select>
            </div>
          </div>

          {state.organizations.length === 0 ? (
            <div className="p-10 text-center"><Building2 className="mx-auto h-8 w-8 text-text-tertiary" aria-hidden="true" /><p className="mt-3 text-sm font-semibold text-text-primary">Todavía no hay consultorios</p><p className="mt-1 text-xs text-text-secondary">El alta real se habilitará cuando estén listos su contrato y la invitación del responsable.</p></div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center"><p className="text-sm font-semibold text-text-primary">No encontramos consultorios con esos filtros</p><p className="mt-1 text-xs text-text-secondary">Probá otro nombre, identificador o estado.</p><Button type="button" variant="ghost" className="mt-3" onClick={clearFilters}>Limpiar filtros</Button></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-left">
                <thead className="bg-surface-subtle"><tr className="text-[11px] uppercase tracking-wide text-text-secondary"><th scope="col" className="table-cell-admin">Consultorio</th><th scope="col" className="table-cell-admin">Identificador</th><th scope="col" className="table-cell-admin">Estado</th><th scope="col" className="table-cell-admin">Fecha de alta</th><th scope="col" className="table-cell-admin">Última actualización</th></tr></thead>
                <tbody className="divide-y divide-border-subtle text-xs">
                  {filtered.map(organization => (
                    <tr key={organization.id} className="transition-colors hover:bg-surface-subtle/70">
                      <td className="table-cell-admin font-semibold text-text-primary">{organization.name}</td>
                      <td className="table-cell-admin text-text-secondary">{organization.slug}</td>
                      <td className="table-cell-admin"><Badge variant={organization.status === 'active' ? 'active' : 'suspended'}>{organization.status === 'active' ? 'Activo' : 'Suspendido'}</Badge></td>
                      <td className="table-cell-admin text-text-secondary">{formatShortDate(organization.createdAt)}</td>
                      <td className="table-cell-admin text-text-secondary"><time dateTime={organization.updatedAt}>{formatFullDateTime(organization.updatedAt)}</time></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
