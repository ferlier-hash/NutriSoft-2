import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealResourcesPage } from '../app/routes/professional/RealResourcesPage';
import { ToastProvider } from '../components/ui/Toast';
import { loadLibrary, loadLibrarySettings, saveLibrary } from '../data/supabase/library.repository';

vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ accessContext: { memberships: [{ role: 'nutritionist', membership_status: 'active', organization_status: 'active', organization_id: 'org', organization_name: 'Clínica Bienestar' }] } }),
}));
vi.mock('../data/supabase/library.repository', () => ({ loadLibrary: vi.fn(), loadLibrarySettings: vi.fn(), saveLibrary: vi.fn(), uploadLibraryPdf: vi.fn(), downloadLibraryPdf: vi.fn() }));

const resources = [
  { id: 'd1', organization_id: 'org', owner_user_id: 'owner', kind: 'document', title: 'Guía práctica', category: 'Guías', status: 'draft', updated_at: '2026-09-04', body: { path: 'owner/org/file.pdf', filename: 'guia.pdf' } },
  { id: 'v1', organization_id: 'org', owner_user_id: 'owner', kind: 'video', title: 'Video educativo', category: 'Educación', status: 'published', updated_at: '2026-09-05', body: { url: 'https://example.com/video' } },
] as never;

function renderPage() {
  return render(<ToastProvider><MemoryRouter><RealResourcesPage/></MemoryRouter></ToastProvider>);
}

describe('Recursos REAL', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(loadLibrary).mockResolvedValue(resources); vi.mocked(loadLibrarySettings).mockResolvedValue({ policy_version:'2026-09-13-v1',accepted:true,accepted_at:'2026-09-13',used_bytes:1048576,limit_bytes:262144000,available_bytes:261095424 }); vi.mocked(saveLibrary).mockResolvedValue('v1'); });

  it('resume, filtra y publica contenido con la versión vigente', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Guía práctica' });
    expect(screen.getByText(/2 de 2 recursos · Clínica Bienestar/)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Buscar por título, categoría o archivo…'), { target: { value: 'Guía' } });
    expect(screen.queryByRole('heading', { name: 'Video educativo' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));
    await waitFor(() => expect(saveLibrary).toHaveBeenCalledWith(expect.objectContaining({ id: 'd1', status: 'published', updated_at: '2026-09-04' })));
  });

  it('crea un enlace HTTPS como borrador sin cargar archivos', async () => {
    renderPage();
    await screen.findByText(/2 de 2 recursos · Clínica Bienestar/);
    fireEvent.click(screen.getByRole('button', { name: 'Agregar recurso' }));
    fireEvent.change(screen.getByLabelText('Título *'), { target: { value: 'Lectura recomendada' } });
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'video' } });
    fireEvent.change(screen.getByLabelText('Enlace HTTPS *'), { target: { value: 'https://example.com/lectura' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    await waitFor(() => expect(saveLibrary).toHaveBeenCalledWith(expect.objectContaining({ organization_id: 'org', kind: 'video', title: 'Lectura recomendada', status: 'draft', body: { url: 'https://example.com/lectura' } })));
  });

  it('bloquea nuevas cargas y muestra el espacio hasta aceptar la declaración', async () => {
    vi.mocked(loadLibrarySettings).mockResolvedValue({ policy_version:'2026-09-13-v1',accepted:false,accepted_at:null,used_bytes:1048576,limit_bytes:262144000,available_bytes:261095424 });
    renderPage();
    expect(await screen.findByText('1 MB', { exact:false })).toBeInTheDocument();
    expect(screen.getByText(/Falta aceptar la declaración/)).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Agregar recurso'})).not.toBeInTheDocument();
    expect(screen.getAllByRole('link',{name:/Configuración|Habilitar cargas/}).length).toBeGreaterThan(0);
  });
});
