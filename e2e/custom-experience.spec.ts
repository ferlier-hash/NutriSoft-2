import { expect, test } from '@playwright/test';
import { authenticateAs } from './support/auth';

const brands = [
  { organization_id: '11111111-1111-4111-8111-111111111111', name: 'Clínica Bienestar', enabled: true, can_edit: true, settings: { displayName: 'Clínica Bienestar', tagline: 'Atención personalizada', colorPreset: 'aqua' }, updated_at: null },
  { organization_id: '22222222-2222-4222-8222-222222222222', name: 'Centro NutriVida', enabled: true, can_edit: true, settings: { displayName: 'Centro NutriVida', colorPreset: 'forest' }, updated_at: null },
];

for (const viewport of [{ name: 'móvil', width: 390, height: 844 }, { name: 'tablet', width: 768, height: 1024 }]) {
  test(`editor Custom se adapta a ${viewport.name} sin mezclar consultorios`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route('**/rest/v1/rpc/get_my_branding', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(brands) }));
    await authenticateAs(page, 'owner@bienestar.test');
    await page.goto('/#/professional/settings');
    await page.locator('#settings-brand').evaluate(element => element.setAttribute('open', ''));
    const editor = page.locator('#settings-brand');
    await expect(editor.getByLabel('Consultorio para personalizar')).toHaveValue(brands[0]!.organization_id);
    await expect(editor.getByRole('button', { name: 'Guardar marca' })).toBeVisible();
    const documentWidth = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(documentWidth.scroll).toBeLessThanOrEqual(documentWidth.client + 1);
    await editor.getByLabel('Texto breve').fill('Borrador sin guardar');
    page.once('dialog', dialog => dialog.dismiss());
    await editor.getByLabel('Consultorio para personalizar').selectOption(brands[1]!.organization_id);
    await expect(editor.getByLabel('Consultorio para personalizar')).toHaveValue(brands[0]!.organization_id);
  });
}
