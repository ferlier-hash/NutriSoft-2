import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealLibraryPage } from '../app/routes/shared/RealLibraryPage';
import { loadLibrary, saveLibrary } from '../data/supabase/library.repository';
vi.mock('../auth/AuthProvider',()=>({useAuth:()=>({accessContext:{memberships:[{role:'nutritionist',organization_status:'active',organization_id:'org'}]}})}));
vi.mock('../data/supabase/library.repository',()=>({loadLibrary:vi.fn(),saveLibrary:vi.fn(),uploadLibraryPdf:vi.fn(),downloadLibraryPdf:vi.fn()}));
const item={id:'r1',organization_id:'org',owner_user_id:'owner',kind:'recipe',title:'Avena',category:'Desayunos',status:'draft',updated_at:'2026-09-04',body:{ingredients:'Avena y agua',steps:'Cocinar',minutes:10,servings:1,tags:'Veggie'}};
describe('real library',()=>{
 beforeEach(()=>{vi.mocked(loadLibrary).mockResolvedValue([item as never]);vi.mocked(saveLibrary).mockResolvedValue('r1');});
 it('filters, resets and publishes using the saved version',async()=>{
  render(<MemoryRouter><RealLibraryPage recipes /></MemoryRouter>);
  await screen.findByText('Avena');
  fireEvent.change(screen.getByLabelText('Buscar en la biblioteca'),{target:{value:'missing'}});
  expect(screen.queryByText('Avena')).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('Limpiar filtros'));
  fireEvent.click(screen.getByRole('button',{name:'Publicar'}));
  await waitFor(()=>expect(saveLibrary).toHaveBeenCalledWith(expect.objectContaining({id:'r1',status:'published',updated_at:'2026-09-04'})));
 });
 it('does not show professional actions or drafts in patient portal',async()=>{
  render(<MemoryRouter><RealLibraryPage recipes patient /></MemoryRouter>);
  await screen.findByText('0 recetas');
  expect(screen.queryByRole('button',{name:'Nueva receta'})).not.toBeInTheDocument();
  expect(screen.queryByText('Avena')).not.toBeInTheDocument();
 });
});
