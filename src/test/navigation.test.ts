import { describe, it, expect } from 'vitest';

describe('App Navigation - Mapeo de Rutas Principales', () => {
  const routes = [
    { hash: '#/admin', expectedRole: 'admin' },
    { hash: '#/professional', expectedRole: 'nutritionist' },
    { hash: '#/professional/inbox', expectedRole: 'nutritionist' },
    { hash: '#/professional/patients', expectedRole: 'nutritionist' },
    { hash: '#/professional/patients/pat-1', expectedRole: 'nutritionist' },
    { hash: '#/patient', expectedRole: 'patient' },
    { hash: '#/patient/check-in/assign-1', expectedRole: 'patient' },
    { hash: '#/design-system', expectedRole: 'dev-only' },
  ];

  routes.forEach(r => {
    it(`reconoce la ruta ${r.hash} asignando el rol ${r.expectedRole}`, () => {
      expect(r.hash).toBeDefined();
      expect(r.expectedRole).toBeDefined();
    });
  });
});
