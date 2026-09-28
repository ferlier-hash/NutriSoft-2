import { expect, test } from '@playwright/test';
import { authenticateAs } from './support/auth';

const patientId = 'f1111111-1111-4111-8111-111111111111';

test.describe.configure({ mode: 'serial' });

test.describe('acciones clínicas reales', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAs(page, 'andrea@bienestar.test');
  });

  test('crea un plan alimentario como borrador independiente', async ({ page }) => {
    const title = `Plan E2E ${Date.now()}`;
    await page.goto('/#/professional/meal-plans');
    await expect(page.getByRole('heading', { name: 'Planes alimentarios' })).toBeVisible();
    await page.getByRole('button', { name: 'Nuevo plan' }).click();
    await page.getByLabel('Título del plan *').fill(title);
    await page.getByLabel('Duración *').fill('7');
    await page.getByRole('button', { name: 'Crear y continuar' }).click();
    await expect(page).toHaveURL(/\/professional\/meal-plans\/[0-9a-f-]+/);
    await expect(page.getByLabel('Título general del plan')).toHaveValue(title);
    await expect(page.getByText('Todavía sin paciente asignado')).toBeVisible();
  });

  test('registra una revisión antropométrica autorizada', async ({ page }) => {
    await page.goto(`/#/professional/patients/${patientId}?tab=anthropometry`);
    await page.getByRole('button', { name: 'Nueva medición' }).click();
    await page.getByRole('spinbutton', { name: 'Peso (kg)', exact: true }).fill('68.4');
    await page.getByLabel('Nota de la revisión').fill('Registro sintético E2E');
    await page.getByRole('button', { name: 'Guardar medición' }).click();
    await expect(page.getByRole('heading', { name: /Historial/ })).toContainText(/revisiones/);
    await expect(page.getByText('68.4', { exact: true }).first()).toBeVisible();
  });

  test('crea una cita confirmada para una paciente asignada', async ({ page }) => {
    await page.goto('/#/professional/agenda');
    await page.getByRole('button', { name: 'Nueva cita' }).click();
    await page.getByLabel('Paciente').selectOption(patientId);
    const future = new Date(Date.now() + 7 * 86_400_000);
    future.setHours(10, 0, 0, 0);
    const local = new Date(future.getTime() - future.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
    await page.getByLabel('Fecha y hora').fill(local);
    await page.getByLabel(/Importe/).fill('12000');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('María González').first()).toBeVisible();
    await expect(page.getByText('Confirmada').first()).toBeVisible();
  });

  test('registra un cobro manual sin procesar dinero', async ({ page }) => {
    await page.goto('/#/professional/income');
    const row = page.getByRole('button', { name: /María González/ }).first();
    await expect(row).toBeVisible();
    await row.click();
    await page.getByLabel(/Monto/).fill('1000');
    await page.getByLabel('Medio').selectOption('transfer');
    await page.getByLabel('Nota opcional').fill('Cobro sintético E2E');
    await page.getByRole('button', { name: 'Registrar cobro' }).click();
    await expect(page.getByRole('button', { name: /María González.*\$ 1\.000,00.*Parcial/ })).toBeVisible();
  });
});

test('el paciente responde un check-in propio', async ({ page }) => {
  await authenticateAs(page, 'maria@paciente.test');
  await page.goto('/#/patient/followup');
  await page.getByRole('button', { name: 'Check-ins' }).click();
  const pending = page.getByRole('button', { name: 'Responder' }).first();
  if (await pending.isVisible()) {
    await pending.click();
  } else {
    await page.getByRole('button', { name: 'Completar check-in' }).first().click();
  }
  const dialog = page.getByRole('dialog', { name: 'Tu check-in' });
  await expect(dialog).toBeVisible();
  for (const group of await dialog.getByRole('group').all()) {
    const radios = group.getByRole('radio');
    if (await radios.count()) await radios.nth(Math.min(3, (await radios.count()) - 1)).check();
  }
  for (const select of await dialog.locator('select').all()) {
    const values = await select.locator('option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value).filter(Boolean));
    if (values[0]) await select.selectOption(values[0]);
  }
  for (const textarea of await dialog.locator('textarea').all()) await textarea.fill('Respuesta sintética E2E');
  await dialog.getByRole('button', { name: 'Enviar respuesta' }).click();
  await expect(dialog).toBeHidden();
});

test.describe('permisos por rol', () => {
  for (const [email, path, expected] of [
    ['asistente@bienestar.test', '/#/professional/meal-plans', /Acceso pendiente|no permitido|sin acceso/i],
    ['owner@bienestar.test', '/#/professional/patients/f1111111-1111-4111-8111-111111111111?tab=anthropometry', /Acceso pendiente|no permitido|sin acceso/i],
    ['admin@nutrisoft.test', '/#/professional/agenda', /Vista comercial|Administrador|Admin/i],
  ] as const) {
    test(`${email} no obtiene acceso clínico por su rol`, async ({ page }) => {
      await authenticateAs(page, email);
      await page.goto(path);
      await expect(page.getByText(expected).first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Nueva medición' })).toHaveCount(0);
    });
  }

  test('otro nutricionista no puede abrir antropometría de una paciente ajena', async ({ page }) => {
    await authenticateAs(page, 'sofia@bienestar.test');
    await page.goto(`/#/professional/patients/${patientId}?tab=anthropometry`);
    await expect(page.getByText(/Ficha no disponible|sin acceso clínico vigente/i)).toBeVisible();
  });
});
