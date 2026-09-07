import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach,it,expect,vi} from 'vitest';
import {RealScheduleSettings} from '../components/domain/RealScheduleSettings';
import {PatientAppointmentPolicy} from '../components/domain/PatientAppointmentPolicy';
const {rpc}=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('../auth/supabase-client',()=>({getSupabaseClient:()=>({schema:()=>({rpc})})}));
beforeEach(()=>rpc.mockReset());
it('no impone horarios iniciales y permite guardar franjas propias',async()=>{
 rpc.mockImplementation((name:string)=>Promise.resolve(name==='get_my_schedule_settings'?{data:{settings:null,updated_at:null},error:null}:{data:'2026-09-03T18:00:00Z',error:null}));
 render(<RealScheduleSettings organizationId="org"/>);const user=userEvent.setup();
 const check=await screen.findByLabelText('Limitar nuevos turnos a estas franjas');expect(check).not.toBeChecked();
 await user.click(check);await user.click(screen.getByRole('button',{name:'Agregar franja de Lunes'}));
 await user.click(screen.getByRole('button',{name:'Guardar horarios y reglas'}));
 expect(rpc).toHaveBeenCalledWith('save_my_schedule_settings',expect.objectContaining({p_org:'org',p_expected:undefined,p_settings:expect.objectContaining({enforceHours:true,intervals:[{day:1,start:'09:00',end:'13:00'}]})}));
 expect(await screen.findByText(/Horarios y reglas guardados/)).toBeInTheDocument();
});
it('conserva el borrador y muestra conflictos enviados por el servidor',async()=>{
 rpc.mockImplementation((name:string)=>Promise.resolve(name==='get_my_schedule_settings'?{data:{settings:null,updated_at:null},error:null}:{data:null,error:{message:'El bloqueo coincide con una cita activa.'}}));
 render(<RealScheduleSettings organizationId="org"/>);const user=userEvent.setup();
 await user.click(await screen.findByRole('button',{name:'Agregar franja de Lunes'}));
 await user.click(screen.getByRole('button',{name:'Guardar horarios y reglas'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('El bloqueo coincide');expect(screen.getByLabelText('Lunes desde 1')).toHaveValue('09:00');
});
it('impide editar si falló la lectura autorizada',async()=>{
 rpc.mockResolvedValue({data:null,error:{message:'denied'}});render(<RealScheduleSettings organizationId="org"/>);
 await screen.findByRole('alert');expect(screen.queryByRole('button',{name:'Guardar horarios y reglas'})).not.toBeInTheDocument();
});
it('explica al paciente que puede solicitar un cambio tardío',async()=>{
 rpc.mockResolvedValue({data:{cancellationNoticeHours:72,rescheduleNoticeHours:24},error:null});
 render(<PatientAppointmentPolicy appointmentId="appointment" startsAt={new Date(Date.now()+3600000).toISOString()} kind="cancel"/>);
 expect(await screen.findByText(/Estás fuera de plazo/)).toHaveTextContent('No se modifica tu cita');
 expect(rpc).toHaveBeenCalledWith('get_patient_appointment_policy',{p_appointment:'appointment'});
});
