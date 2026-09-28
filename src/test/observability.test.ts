import { describe, expect, it } from 'vitest';
import { redactTechnicalText, sanitizeTechnicalEvent } from '../lib/observability';

describe('observabilidad segura', () => {
  it('elimina identificadores, correos y tokens del texto técnico', () => {
    expect(redactTechnicalText('ada@example.com 11111111-1111-4111-8111-111111111111 eyJaaaaaaaaaaa.bbbbbbbbbbb.ccccccccccc'))
      .toBe('[email] [id] [token]');
  });

  it('descarta usuario, request, extras y breadcrumbs antes del envío', () => {
    const event = sanitizeTechnicalEvent({
      message: 'Falló para ada@example.com',
      transaction: '/patients/11111111-1111-4111-8111-111111111111?token=secret',
      user: { email: 'ada@example.com' },
      request: { data: 'nota clínica' },
      extra: { patient: 'Ada' },
      breadcrumbs: [{ message: 'formulario' }],
      contexts: { browser: { name: 'Test' }, patient: { name: 'Ada' } },
      event_id: 'technical-event',
    });
    expect(event).toMatchObject({ message: 'Falló para [email]', transaction: '/patients/[id]', contexts: { browser: { name: 'Test' } } });
    expect(event).not.toHaveProperty('user');
    expect(event).not.toHaveProperty('request');
    expect(event).not.toHaveProperty('extra');
    expect(event).not.toHaveProperty('breadcrumbs');
  });
});
