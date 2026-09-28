import { publicEnvironment } from '../config/environment';
import type { Event, TransactionEvent } from '@sentry/core';

const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const uuidPattern = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const tokenPattern = /\b(?:eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_-]{10,})?|[A-Za-z0-9_-]{32,})\b/g;

export function redactTechnicalText(value: string) {
  return value
    .replace(emailPattern, '[email]')
    .replace(uuidPattern, '[id]')
    .replace(tokenPattern, '[token]')
    .replace(/([?&](?:token|code|key|signature|email|redirect_to)=)[^&#\s]+/gi, '$1[redacted]');
}

export function sanitizeTechnicalEvent<T extends Event | TransactionEvent>(event: T): T {
  const sanitized = { ...event } as T;
  delete sanitized.user;
  delete sanitized.request;
  delete sanitized.extra;
  delete sanitized.breadcrumbs;

  if (sanitized.message) sanitized.message = redactTechnicalText(sanitized.message);
  if (sanitized.transaction) sanitized.transaction = redactTechnicalText(sanitized.transaction.split('?')[0] ?? '');
  if (sanitized.exception?.values) {
    sanitized.exception = {
      ...sanitized.exception,
      values: sanitized.exception.values.map(value => ({ ...value, value: value.value ? redactTechnicalText(value.value) : value.value })),
    };
  }
  if (sanitized.contexts) {
    sanitized.contexts = Object.fromEntries(
      Object.entries(sanitized.contexts).filter(([key]) => ['browser', 'device', 'os', 'runtime', 'react'].includes(key)),
    ) as typeof sanitized.contexts;
  }
  return sanitized;
}

let enabled = false;

export async function initializeObservability() {
  if (!publicEnvironment.sentryDsn || publicEnvironment.appEnvironment === 'local') return;
  const Sentry = await import('@sentry/react');
  Sentry.init({
    dsn: publicEnvironment.sentryDsn,
    environment: publicEnvironment.appEnvironment,
    sendDefaultPii: false,
    maxBreadcrumbs: 0,
    attachStacktrace: true,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: publicEnvironment.appEnvironment === 'production' ? 0.02 : 0.05,
    tracePropagationTargets: [],
    beforeSend: event => sanitizeTechnicalEvent(event),
    beforeSendTransaction: event => sanitizeTechnicalEvent(event),
  });
  enabled = true;
}

export async function captureTechnicalError(error: unknown, area: string) {
  if (!enabled) return;
  const Sentry = await import('@sentry/react');
  Sentry.withScope(scope => {
    scope.setTag('technical_area', area.replace(/[^a-z0-9_.-]/gi, '').slice(0, 40) || 'unknown');
    Sentry.captureException(error instanceof Error ? error : new Error('Unknown technical error'));
  });
}
