import React from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Activity,
  Building2,
  CalendarDays,
  ChevronRight,
  Clock3,
  Mail,
  Phone,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Users,
} from 'lucide-react';
import { useMock } from '../../provider';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { NotFoundPage } from '../NotFoundPage';
import { formatFullDateTime, formatRelativeTime, formatShortDate } from '../../../lib/dateUtils';
import { PLAN_LABELS } from '../../../lib/adminCommercial';

export const NutritionistDetailPage: React.FC = () => {
  const { nutritionistId } = useParams<{ nutritionistId: string }>();
  const { nutritionists, organizations, patients } = useMock();
  const nutritionist = nutritionists.find(item => item.id === nutritionistId);

  if (!nutritionist) {
    return (
      <NotFoundPage
        title="Nutricionista no encontrado"
        message="El perfil del nutricionista consultado no existe o no está registrado."
      />
    );
  }

  const organization = organizations.find(item => item.id === nutritionist.organizationId);
  const assignedPatients = patients.filter(patient => patient.assignedNutritionistId === nutritionist.id);
  const statusVariant = nutritionist.status === 'active' ? 'active' : 'suspended';
  const statusLabel = nutritionist.status === 'active' ? 'Cuenta activa' : 'Cuenta suspendida';

  const summaryCards = [
    {
      label: 'Pacientes asignados',
      value: assignedPatients.length.toString(),
      detail: assignedPatients.length === 1 ? 'Paciente a cargo' : 'Pacientes a cargo',
      icon: Users,
    },
    {
      label: 'Fecha de alta',
      value: formatShortDate(nutritionist.joinedAt),
      detail: 'Alta en la plataforma',
      icon: CalendarDays,
    },
    {
      label: 'Última actividad',
      value: formatRelativeTime(nutritionist.lastActiveAt),
      detail: formatFullDateTime(nutritionist.lastActiveAt),
      icon: Clock3,
    },
    {
      label: 'Estado de cuenta',
      value: nutritionist.status === 'active' ? 'Activa' : 'Suspendida',
      detail: nutritionist.status === 'active' ? 'Acceso operativo habilitado' : 'Acceso operativo restringido',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1180px] mx-auto">
      <nav aria-label="Breadcrumb" className="text-xs text-text-secondary flex items-center gap-1.5 font-medium">
        <Link to="/admin" className="hover:text-text-primary">Admin</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to="/admin/nutritionists" className="hover:text-text-primary">Nutricionistas</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-text-primary font-semibold">{nutritionist.name}</span>
      </nav>

      <section className="rounded-3xl border border-border-subtle bg-[linear-gradient(135deg,#E9F8F7_0%,#EEF7FB_58%,#FCF9E8_100%)] p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-white/80 border border-white flex items-center justify-center text-brand-strong shrink-0">
              <Stethoscope className="w-7 h-7" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold text-text-primary">{nutritionist.name}</h2>
                <Badge variant={statusVariant}>{statusLabel}</Badge>
              </div>
              <p className="text-sm text-text-secondary mt-1">
                Profesional de <strong className="text-brand-strong">{nutritionist.organizationName}</strong>
              </p>
            </div>
          </div>
          <Button asChild variant="secondary">
            <Link to="/admin/nutritionists">Volver a nutricionistas</Link>
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3" aria-label="Resumen del nutricionista">
        {summaryCards.map(({ label, value, detail, icon: Icon }) => (
          <div key={label} className="bg-surface border border-border-subtle rounded-2xl p-4 shadow-sm">
            <Icon className="w-4 h-4 text-brand-strong" />
            <p className="text-[11px] text-text-secondary mt-3">{label}</p>
            <p className="text-lg font-bold text-text-primary mt-1">{value}</p>
            <p className="text-[11px] text-text-tertiary mt-1">{detail}</p>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border-subtle pb-3">
            <UserRound className="w-4 h-4 text-brand-strong" />
            <h3 className="font-bold text-text-primary">Datos de contacto</h3>
          </div>
          <div className="space-y-3">
            <a href={`mailto:${nutritionist.email}`} className="flex items-center gap-3 rounded-xl bg-surface-subtle p-3 hover:bg-[#EAF2F4] transition-colors">
              <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-brand-strong shrink-0"><Mail className="w-4 h-4" /></span>
              <span className="min-w-0"><span className="block text-[11px] text-text-secondary">Correo electrónico</span><span className="block text-sm font-semibold text-text-primary truncate">{nutritionist.email}</span></span>
            </a>
            <a href={`tel:${nutritionist.phone}`} className="flex items-center gap-3 rounded-xl bg-surface-subtle p-3 hover:bg-[#EAF2F4] transition-colors">
              <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-brand-strong shrink-0"><Phone className="w-4 h-4" /></span>
              <span><span className="block text-[11px] text-text-secondary">Teléfono</span><span className="block text-sm font-semibold text-text-primary">{nutritionist.phone}</span></span>
            </a>
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border-subtle pb-3">
            <Building2 className="w-4 h-4 text-brand-strong" />
            <h3 className="font-bold text-text-primary">Consultorio vinculado</h3>
          </div>
          <div>
            <p className="text-lg font-bold text-text-primary">{nutritionist.organizationName}</p>
            <p className="text-xs text-text-secondary mt-1">
              {organization ? `${organization.location} · Plan ${PLAN_LABELS[organization.plan]}` : 'Organización principal'}
            </p>
          </div>
          {organization && (
            <Button asChild variant="secondary" size="sm" className="gap-1">
              <Link to={`/admin/organizations/${organization.id}`}>Ver consultorio <ChevronRight className="w-3.5 h-3.5" /></Link>
            </Button>
          )}
        </Card>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-strong" />
            <h3 className="font-bold text-text-primary">Pacientes asignados</h3>
          </div>
          {assignedPatients.length > 0 && <Badge variant="info">{assignedPatients.length} en total</Badge>}
        </div>

        {assignedPatients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {assignedPatients.map(patient => (
              <article key={patient.id} className="rounded-2xl border border-border-subtle bg-surface-subtle p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-text-primary">{patient.firstName} {patient.lastName}</p>
                    <Badge variant={patient.status === 'active' ? 'active' : 'neutral'}>{patient.status === 'active' ? 'Activo' : 'Archivado'}</Badge>
                  </div>
                  <p className="text-[11px] text-text-secondary mt-1">Asignado el {formatShortDate(patient.createdAt)}</p>
                  <p className="text-[11px] text-text-tertiary mt-0.5">Última actividad: {formatFullDateTime(patient.lastActiveAt)}</p>
                </div>
                <Button asChild variant="secondary" size="sm" className="shrink-0">
                  <Link to={`/admin/nutritionists/${nutritionist.id}/patients/${patient.id}`} aria-label={`Ver perfil de ${patient.firstName} ${patient.lastName}`}>
                    Ver <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-surface-subtle px-4 py-6 text-center">
            <Users className="w-6 h-6 text-text-tertiary mx-auto" />
            <p className="text-sm font-semibold text-text-primary mt-2">Sin pacientes asignados</p>
            <p className="text-xs text-text-secondary mt-1">Cuando reciba una asignación, aparecerá en esta tarjeta.</p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border-subtle pb-3">
            <Activity className="w-4 h-4 text-brand-strong" />
            <h3 className="font-bold text-text-primary">Actividad operativa</h3>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-primary mt-1.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-text-primary">Último inicio de sesión</p>
              <p className="text-xs text-text-secondary mt-1">{formatFullDateTime(nutritionist.lastActiveAt)}</p>
              <p className="text-[11px] text-brand-strong font-semibold mt-1">{formatRelativeTime(nutritionist.lastActiveAt)}</p>
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border-subtle pb-3">
            <ShieldCheck className="w-4 h-4 text-brand-strong" />
            <h3 className="font-bold text-text-primary">Estado de cuenta</h3>
          </div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-text-primary">Acceso a la plataforma</p>
              <p className="text-xs text-text-secondary mt-1">
                {nutritionist.status === 'active' ? 'Puede operar dentro del consultorio asignado.' : 'El acceso operativo se encuentra restringido.'}
              </p>
            </div>
            <Badge variant={statusVariant}>{nutritionist.status === 'active' ? 'Activo' : 'Suspendido'}</Badge>
          </div>
        </Card>
      </div>
    </div>
  );
};
