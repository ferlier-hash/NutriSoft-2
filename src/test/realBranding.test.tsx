import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { RealBrandingProvider, RealBrandingSettings, RealBrandHeader, RealBrandIdentity } from '../components/domain/RealBranding';
const {rpc,signedUrl}=vi.hoisted(()=>({rpc:vi.fn(),signedUrl:vi.fn(async(path:string)=>({data:{signedUrl:`https://example.com/${path}`},error:null}))}));
vi.mock('../auth/supabase-client',()=>({getSupabaseClient:()=>({schema:()=>({rpc}),storage:{from:()=>({createSignedUrl:signedUrl})}})}));
beforeEach(()=>{rpc.mockReset();});
const row={organization_id:'org',name:'Consultorio',enabled:true,can_edit:true,settings:{},updated_at:null};
it('permite al responsable guardar una paleta sin enviar imágenes base64',async()=>{
 rpc.mockResolvedValue({data:[row],error:null});
 render(<RealBrandingProvider><RealBrandingSettings/></RealBrandingProvider>);
 const user=userEvent.setup(); await screen.findByRole('button',{name:'Guardar marca'});
 await user.click(screen.getByRole('button',{name:'Guardar marca'}));
 expect(rpc).toHaveBeenCalledWith('save_organization_branding',{p_org:'org',p_settings:{displayName:'Consultorio',colorPreset:'aqua'},p_expected:undefined});
});
it('no muestra el editor al nutricionista',async()=>{
 rpc.mockResolvedValue({data:[{...row,can_edit:false}],error:null});
 render(<RealBrandingProvider><RealBrandingSettings/></RealBrandingProvider>);
 expect(await screen.findByText(/Sólo el responsable/)).toBeInTheDocument();
 expect(screen.queryByText('Guardar marca')).not.toBeInTheDocument();
});
it('muestra contactos y texto sin exigir una imagen de cabecera',async()=>{
 rpc.mockResolvedValue({data:[{...row,settings:{tagline:'Atención personalizada',contactPhone:'+54 351 1234567',contactEmail:'hola@example.com',contactAddress:'Consultas virtuales'}}],error:null});
 render(<RealBrandingProvider><RealBrandHeader patient/></RealBrandingProvider>);
 expect(await screen.findByText('Atención personalizada')).toBeInTheDocument();
 expect(screen.getByRole('link',{name:'+54 351 1234567'})).toHaveAttribute('href','tel:+543511234567');
 expect(screen.getByRole('link',{name:'hola@example.com'})).toHaveAttribute('href','mailto:hola%40example.com');
 expect(screen.getByText('Consultas virtuales')).toBeInTheDocument();
});
it('mantiene neutral una sesión con varios consultorios',async()=>{
 rpc.mockResolvedValue({data:[row,{...row,organization_id:'otra',name:'Otra clínica'}],error:null});
 render(<RealBrandingProvider><RealBrandIdentity patient/><RealBrandHeader/><RealBrandingSettings/></RealBrandingProvider>);
 await screen.findByLabelText('Consultorio para personalizar');
 expect(screen.getByText('Portal del paciente')).toBeInTheDocument();
 expect(screen.queryByRole('region')).not.toBeInTheDocument();
});
it('recargar descarta el borrador aunque la versión guardada no haya cambiado',async()=>{
 rpc.mockResolvedValue({data:[row],error:null});
 render(<RealBrandingProvider><RealBrandingSettings/></RealBrandingProvider>);
 const user=userEvent.setup();const input=await screen.findByLabelText('Nombre visible');
 await user.clear(input);await user.type(input,'Borrador');
 await user.click(screen.getByRole('button',{name:'Recargar marca guardada'}));
 expect(await screen.findByDisplayValue('Consultorio')).toBeInTheDocument();
});
it('conserva cabeceras independientes para cada portal',async()=>{
 rpc.mockResolvedValue({data:[{...row,settings:{patientHeaderPath:'org/patient.webp',professionalHeaderPath:'org/professional.webp'}}],error:null});
 render(<RealBrandingProvider><RealBrandHeader patient/><RealBrandHeader/></RealBrandingProvider>);
 const headers=await screen.findAllByRole('img');
 expect(headers.map(img=>img.getAttribute('src'))).toEqual(['https://example.com/org/patient.webp','https://example.com/org/professional.webp']);
});
it('no aplica la marca cuando CUSTOM está deshabilitado',async()=>{
 rpc.mockResolvedValue({data:[{...row,enabled:false,settings:{tagline:'No visible'}}],error:null});
 render(<RealBrandingProvider><RealBrandHeader/><RealBrandingSettings/></RealBrandingProvider>);
 await screen.findByText(/Exclusiva de Custom/);
 expect(screen.queryByText('No visible')).not.toBeInTheDocument();
});
