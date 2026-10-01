import { expect, test } from '@playwright/test';
import { authenticateAs } from './support/auth';

const mailpitApi = 'http://127.0.0.1:54324/api/v1';

test('alta REAL sintética de consultorio, profesional y cuatro pacientes', async ({ page }) => {
  // Reuse the clinic left by a prior interrupted local run, rather than
  // accumulating synthetic clinics when iterating on this end-to-end flow.
  const stamp = '1790867814390';
  const organizationName = `Clínica QA Sintética ${stamp}`;
  const professionalEmail = `qa-prof-${stamp}@nutrify.test`;
  await authenticateAs(page, 'admin@nutrisoft.test');

  await page.goto('/#/admin/organizations');
  await expect(page.getByRole('heading', { name: 'Consultorios registrados' })).toBeVisible();
  await page.getByLabel('Buscar consultorio').fill(`clinica-qa-${stamp}`);
  const existingClinic = page.getByRole('link', { name: new RegExp(`^${organizationName}`) });
  const clinicExists = await expect(existingClinic).toBeVisible({ timeout: 2_000 }).then(() => true, () => false);
  if (clinicExists) {
    await existingClinic.click();
  } else {
    await page.getByRole('button', { name: /nuevo consultorio/i }).click();
    await page.getByLabel('Nombre del consultorio').fill(organizationName);
    const slug = `clinica-qa-${stamp}`;
    await page.getByLabel('Identificador del consultorio').fill(slug);
    await page.getByRole('button', { name: 'Crear consultorio', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: organizationName })).toBeVisible();

  const summary = page.getByRole('region', { name: 'Resumen del consultorio' });
  if (!await summary.getByText('PRO', { exact: true }).count()) {
    await page.getByRole('combobox', { name: 'Plan' }).selectOption({ label: 'PRO' });
    await page.getByRole('combobox', { name: 'Estado' }).selectOption('active');
    await page.getByRole('button', { name: /guardar desde esta fecha/i }).click();
    await expect(summary.getByText('PRO', { exact: true })).toBeVisible();
  }

  const browser = page.context().browser();
  if (!browser) throw new Error('El proyecto E2E no expuso el navegador local.');
  const professionalContext = await browser.newContext();
  const professionalPage = await professionalContext.newPage();
  const professionalMember = page.getByText('Profesional QA Sintético');
  if (await professionalMember.count()) {
    await expect(page.getByText('Membresía activa', { exact: true })).toBeVisible();
    await authenticateAs(professionalPage, professionalEmail);
    await professionalPage.goto('/#/professional/patients');
  } else {
    await page.getByLabel('Nombre profesional').fill('Profesional QA Sintético');
    await page.getByLabel('Correo de invitación').fill(professionalEmail);
    await page.getByRole('button', { name: 'Invitar profesional' }).click();
    await expect(page.getByRole('status').filter({ hasText: /invitación enviada/i })).toBeVisible({ timeout: 20_000 });
    await professionalPage.goto(await latestAuthLink(professionalEmail));
    await expect(professionalPage.getByRole('heading', { name: 'Creá una nueva contraseña' })).toBeVisible();
    await professionalPage.getByLabel('Nueva contraseña').fill('NutrifyQA!2026-A');
    await professionalPage.getByLabel('Repetir contraseña').fill('NutrifyQA!2026-A');
    await professionalPage.getByRole('button', { name: 'Guardar contraseña' }).click();
    await professionalPage.getByRole('link', { name: 'Continuar' }).click();
  }
  await expect(professionalPage.getByRole('heading', { name: 'Pacientes', exact: true })).toBeVisible();
  for (let index = 1; index <= 4; index += 1) {
    const patientName = `Paciente QA ${index} Sintético`;
    if (await professionalPage.getByText(patientName).count()) continue;
    const email = `qa-patient-${index}-${stamp}@nutrify.test`;
    await professionalPage.getByRole('button', { name: 'Invitar paciente' }).click();
    await professionalPage.getByLabel('Nombre', { exact: true }).fill(`Paciente QA ${index}`);
    await professionalPage.getByLabel('Apellido', { exact: true }).fill('Sintético');
    await professionalPage.getByLabel('Correo electrónico', { exact: true }).fill(email);
    await professionalPage.getByRole('button', { name: 'Enviar invitación' }).click();
    await expect(professionalPage.getByRole('status').filter({ hasText: /invitación preparada/i })).toBeVisible({ timeout: 20_000 });
    const patientLink = await latestAuthLink(email);
    const patientContext = await browser.newContext();
    const patientPage = await patientContext.newPage();
    await patientPage.goto(patientLink);
    await expect(patientPage.getByRole('heading', { name: 'Creá una nueva contraseña' })).toBeVisible();
    await patientPage.getByLabel('Nueva contraseña').fill(`NutrifyPatient!2026-${index}`);
    await patientPage.getByLabel('Repetir contraseña').fill(`NutrifyPatient!2026-${index}`);
    await patientPage.getByRole('button', { name: 'Guardar contraseña' }).click();
    await patientPage.getByRole('link', { name: 'Continuar' }).click();
    await expect(patientPage).toHaveURL(/#\/(patient|portal)/);
    await professionalPage.goto('/#/professional/patients');
    await expect(professionalPage.getByRole('link', { name: `Paciente QA ${index} Sintético`, exact: true })).toBeVisible();
    await patientContext.close();
  }
  await expect(professionalPage.getByRole('link', { name: 'Paciente QA 4 Sintético', exact: true })).toBeVisible();
  await professionalContext.close();
  await page.reload();
  await expect(page.getByRole('region', { name: 'Resumen del consultorio' }).getByText('4', { exact: true })).toBeVisible();
});

async function latestAuthLink(email: string): Promise<string> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const listResponse = await fetch(`${mailpitApi}/messages`);
    if (listResponse.ok) {
      const response = await listResponse.json() as { messages?: Array<{ ID: string; Created: string; To?: Array<{ Address: string }> }> };
      const latest = response.messages?.filter(message => message.To?.some(recipient => recipient.Address.toLowerCase() === email.toLowerCase()))
        .sort((left, right) => Date.parse(right.Created) - Date.parse(left.Created))[0];
      if (latest) {
        const messageResponse = await fetch(`${mailpitApi}/message/${encodeURIComponent(latest.ID)}`);
        if (messageResponse.ok) {
          const message = await messageResponse.json() as { Text?: string; HTML?: string };
          const body = `${message.Text ?? ''}\n${message.HTML ?? ''}`.replaceAll('&amp;', '&').replaceAll('&#x3D;', '=');
          const link = body.match(/https?:\/\/[^\s"'<>]+(?:verify|token_hash|auth\/v1)[^\s"'<>]*/i)?.[0];
          if (link) return link;
        }
      }
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  throw new Error(`No llegó el correo de verificación al buzón Mailpit local sintético ${email}.`);
}
