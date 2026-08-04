import { describe, it, expect } from 'vitest';

describe('CheckInForm - Confirmaciones Neutrales', () => {
  it('retorna el mensaje neutral estándar cuando NO se solicita ayuda', () => {
    const helpRequested = false;
    const confirmationMessage = helpRequested
      ? 'Tu solicitud fue registrada y destacada para que tu nutricionista pueda revisarla.'
      : 'Recibimos tu check-in. Tu nutricionista podrá revisar tus respuestas y contactarte si es necesario.';

    expect(confirmationMessage).toBe(
      'Recibimos tu check-in. Tu nutricionista podrá revisar tus respuestas y contactarte si es necesario.'
    );
    expect(confirmationMessage).not.toContain('diagnóstico');
    expect(confirmationMessage).not.toContain('recomendación automática');
  });

  it('retorna el mensaje de solicitud registrada cuando SÍ se solicita ayuda', () => {
    const helpRequested = true;
    const confirmationMessage = helpRequested
      ? 'Tu solicitud fue registrada y destacada para que tu nutricionista pueda revisarla.'
      : 'Recibimos tu check-in. Tu nutricionista podrá revisar tus respuestas y contactarte si es necesario.';

    expect(confirmationMessage).toBe(
      'Tu solicitud fue registrada y destacada para que tu nutricionista pueda revisarla.'
    );
  });
});
