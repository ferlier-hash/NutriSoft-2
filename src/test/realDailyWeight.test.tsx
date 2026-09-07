import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {describe,it,expect,vi,beforeEach} from 'vitest';
import {RealDailyWeight} from '../components/domain/RealDailyWeight';
import {recordWeight} from '../data/supabase/daily-followup.repository';
vi.mock('../data/supabase/daily-followup.repository',()=>({recordWeight:vi.fn()}));
vi.mock('../data/supabase/patient-profile.repository',()=>({loadInitialMeasurements:vi.fn().mockResolvedValue(null)}));
describe('real daily weight',()=>{
 beforeEach(()=>vi.mocked(recordWeight).mockReset());
 it('preserves a backdated date and retries with the same request identity',async()=>{
  vi.mocked(recordWeight).mockRejectedValueOnce(new Error('Reintentar')).mockResolvedValueOnce(undefined);
  render(<RealDailyWeight patientId="patient" rows={[]} onSaved={async()=>{}}/>);
  fireEvent.change(screen.getByLabelText('Fecha'),{target:{value:'2026-01-23'}});
  fireEvent.change(screen.getByLabelText('Peso (kg)'),{target:{value:'70'}});
  fireEvent.click(screen.getByRole('button',{name:'Guardar peso'}));
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button',{name:'Guardar peso'}));
  await waitFor(()=>expect(recordWeight).toHaveBeenCalledTimes(2));
  expect(vi.mocked(recordWeight).mock.calls[0]).toEqual(vi.mocked(recordWeight).mock.calls[1]);
  expect(recordWeight).toHaveBeenCalledWith('patient','2026-01-23',70,expect.any(String));
 });
 it('does not render another patient weight',()=>{
  render(<RealDailyWeight patientId="patient" rows={[{id:'x',patient_id:'other',recorded_on:'2026-01-23',weight_kg:77,origin:'patient',created_at:'2026-01-23'}]} onSaved={async()=>{}}/>);
  expect(screen.queryByText('77 kg')).not.toBeInTheDocument();
  expect(screen.getByText('Sin registros')).toBeInTheDocument();
 });
});
