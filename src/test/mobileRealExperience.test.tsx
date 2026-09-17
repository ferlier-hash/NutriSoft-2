import {render,screen} from '@testing-library/react';
import type {ReactNode} from 'react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter,Route,Routes} from 'react-router-dom';
import {beforeEach,expect,it,vi} from 'vitest';
import {RealClinicalLayout} from '../app/layouts/RealClinicalLayout';
import {RealPatientMealPlansPage} from '../app/routes/patient/RealPatientMealPlansPage';

const mealActivity=vi.fn();
vi.mock('../auth/AuthProvider',()=>({useAuth:()=>({profile:{fullName:'María Paciente'},signOut:vi.fn()})}));
vi.mock('../components/domain/RealBranding',()=>({RealBrandingProvider:({children}:{children:ReactNode})=><>{children}</>,RealBrandIdentity:()=> <span>NutriSoft</span>,RealBrandHeader:()=>null}));
vi.mock('../components/domain/RealDailyHome',()=>({RealDailyHome:()=> <div>Resumen cotidiano</div>}));
vi.mock('../data/supabase/clinical-meal-plans.repository',()=>({
 loadPatientMealPlans:async()=>[{id:'plan',organizationId:'org',patientId:'patient',assignmentId:'assignment',assignmentKind:'primary',versionId:'version',versionNumber:1,title:'Plan semanal',publishedAt:'2026-09-13',content:{days:[{id:'day',title:'Lunes',meals:[{id:'meal',type:'Almuerzo',items:[{id:'item',description:'Ensalada completa'}]}]}]}}],
 loadMealPlanActivity:async()=>[],setMealPlanActivity:(value:unknown)=>mealActivity(value),
}));

beforeEach(()=>mealActivity.mockReset());

it('ofrece navegación inferior clara y agrupa destinos secundarios del paciente',async()=>{
 const user=userEvent.setup();
 render(<MemoryRouter initialEntries={['/patient']}><Routes><Route path="/patient" element={<RealClinicalLayout portal="patient"/>}><Route index element={<p>Inicio paciente</p>}/><Route path="followup" element={<p>Seguimiento</p>}/></Route></Routes></MemoryRouter>);
 const nav=screen.getByRole('navigation',{name:'Navegación del paciente'});
 expect(nav).toHaveTextContent('Inicio');expect(nav).toHaveTextContent('Seguimiento');expect(nav).toHaveTextContent('Citas');expect(nav).toHaveTextContent('Recetas');
 await user.click(screen.getByRole('button',{name:'Más'}));
 expect(screen.getByRole('dialog')).toHaveTextContent('Recursos');expect(screen.getByRole('dialog')).toHaveTextContent('Registrar peso');
});

it('mantiene los comentarios de comidas cerrados hasta que el paciente los necesita',async()=>{
 const user=userEvent.setup();render(<MemoryRouter><RealPatientMealPlansPage/></MemoryRouter>);
 expect(await screen.findByText('Ensalada completa')).toBeInTheDocument();
 expect(screen.queryByPlaceholderText('Comentario opcional para tu nutricionista')).not.toBeInTheDocument();
 await user.click(screen.getByRole('button',{name:'Agregar comentario'}));
 expect(screen.getByPlaceholderText('Comentario opcional para tu nutricionista')).toBeInTheDocument();
 expect(screen.getByText('0/1')).toBeInTheDocument();
});
