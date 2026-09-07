import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {beforeEach,describe,it,expect,vi} from 'vitest';
import {RealInitialMeasurements} from '../components/domain/RealInitialMeasurements';
import {loadInitialMeasurements,saveInitialMeasurements} from '../data/supabase/patient-profile.repository';
vi.mock('../data/supabase/patient-profile.repository',()=>({loadInitialMeasurements:vi.fn(),saveInitialMeasurements:vi.fn()}));
describe('Initial measurements',()=>{
 beforeEach(()=>{vi.mocked(loadInitialMeasurements).mockResolvedValue(null);vi.mocked(saveInitialMeasurements).mockResolvedValue(undefined);vi.clearAllMocks();});
 it('lets patient declare optional initial and target without inventing other values',async()=>{
 render(<RealInitialMeasurements patientId="p" patient/>);
 await screen.findByLabelText('Peso inicial (kg)');
 fireEvent.change(screen.getByLabelText('Peso inicial (kg)'),{target:{value:'75'}});
 fireEvent.change(screen.getByLabelText('Peso objetivo (kg)'),{target:{value:'70'}});
 fireEvent.click(screen.getByRole('button',{name:'Guardar datos iniciales'}));
 await waitFor(()=>expect(saveInitialMeasurements).toHaveBeenCalledWith('p',expect.any(String),{height_cm:null,initial_weight_kg:75,waist_cm:null,hip_cm:null,target_weight_kg:70},undefined));
 });
 it('does not allow professional to set patient target',async()=>{
 render(<RealInitialMeasurements patientId="p"/>);
 expect(await screen.findByLabelText('Peso objetivo (kg)')).toBeDisabled();
 expect(screen.getByLabelText('Altura (cm)')).toBeEnabled();
 });
});
