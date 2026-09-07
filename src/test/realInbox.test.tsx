import {render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import {it,expect,vi} from 'vitest';
import {RealInboxPage} from '../app/routes/professional/RealInboxPage';
const {rpc,order}=vi.hoisted(()=>({rpc:vi.fn(),order:vi.fn()}));
vi.mock('../auth/supabase-client',()=>({getSupabaseClient:()=>({schema:()=>({rpc,from:()=>({select:()=>({order})})})})}));
it('muestra respuesta de alerta y confirma resolución sin cerrar ante error',async()=>{
 order.mockResolvedValue({data:[{id:'a',patient_id:'p',patient_first_name:'Laura',patient_last_name:'Pérez',status:'unresolved',priority:'high',rule_code:'HELP_REQUESTED',created_at:'2026-09-04T10:00:00Z',help_requested:true}],error:null});
 rpc.mockResolvedValue({error:{message:'No se pudo guardar'}});
 render(<MemoryRouter><RealInboxPage/></MemoryRouter>);const user=userEvent.setup();
 await user.click(await screen.findByRole('button',{name:/Laura Pérez/}));
 expect(screen.getByText('El paciente solicitó ayuda.')).toBeInTheDocument();
 await user.click(screen.getByRole('button',{name:'Resolver aviso'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar');expect(screen.getByRole('dialog')).toBeInTheDocument();
 rpc.mockResolvedValue({data:true,error:null});await user.click(screen.getByRole('button',{name:'Resolver aviso'}));
 expect(await screen.findByText('Aviso resuelto. Queda disponible en el historial.')).toBeInTheDocument();
});
