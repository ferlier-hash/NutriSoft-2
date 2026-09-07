import { describe, expect, it } from 'vitest';
import {
  accessContextSchema,
  getAuthorizedPortals,
  getDefaultPortal,
  hasSuspendedAccess,
  type AccessContext,
} from '../auth/access-control';

const baseContext: AccessContext = {
  user_id: 'a0000000-0000-4000-8000-000000000000',
  platform_role: null,
  memberships: [],
  patient_accesses: [],
};

describe('resolución de acceso por sesión', () => {
  it('mantiene Platform Admin exclusivamente en el portal comercial', () => {
    const context: AccessContext = {
      ...baseContext,
      platform_role: 'platform_admin',
      memberships: [{
        organization_id: '11111111-1111-4111-8111-111111111111',
        organization_name: 'Clínica Bienestar',
        organization_status: 'active',
        role: 'nutritionist',
        membership_status: 'active',
      }],
    };
    expect(getAuthorizedPortals(context)).toEqual(['admin']);
  });

  it('habilita el portal profesional para owner o nutricionista activos', () => {
    const context: AccessContext = {
      ...baseContext,
      memberships: [{
        organization_id: '11111111-1111-4111-8111-111111111111',
        organization_name: 'Clínica Bienestar',
        organization_status: 'active',
        role: 'organization_owner',
        membership_status: 'active',
      }],
    };
    expect(getDefaultPortal(context)).toBe('professional');
  });

  it('no entrega acceso clínico al assistant', () => {
    const context: AccessContext = {
      ...baseContext,
      memberships: [{
        organization_id: '11111111-1111-4111-8111-111111111111',
        organization_name: 'Clínica Bienestar',
        organization_status: 'active',
        role: 'assistant',
        membership_status: 'active',
      }],
    };
    expect(getAuthorizedPortals(context)).toEqual([]);
  });

  it('habilita el portal paciente sólo con acceso y cuenta activos', () => {
    const context: AccessContext = {
      ...baseContext,
      patient_accesses: [{
        organization_id: '11111111-1111-4111-8111-111111111111',
        organization_status: 'active',
        patient_id: 'f1111111-1111-4111-8111-111111111111',
        patient_status: 'active',
        access_status: 'active',
      }],
    };
    expect(getAuthorizedPortals(context)).toEqual(['patient']);
  });

  it('bloquea y reconoce una organización suspendida', () => {
    const context: AccessContext = {
      ...baseContext,
      memberships: [{
        organization_id: '33333333-3333-4333-8333-333333333333',
        organization_name: 'Clínica Suspendida',
        organization_status: 'suspended',
        role: 'nutritionist',
        membership_status: 'active',
      }],
    };
    expect(getAuthorizedPortals(context)).toEqual([]);
    expect(hasSuspendedAccess(context)).toBe(true);
  });

  it('rechaza contextos incompletos o con roles inventados', () => {
    expect(accessContextSchema.safeParse({ ...baseContext, platform_role: 'superuser' }).success).toBe(false);
  });
});
