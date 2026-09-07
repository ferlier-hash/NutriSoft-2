import {render,screen,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {it,expect,vi,beforeEach} from 'vitest';
import {CheckinQuestionLibrary} from '../components/domain/CheckinQuestionLibrary';
import {QuestionCheckinForm} from '../components/domain/QuestionCheckinForm';
import {newQuestion} from '../lib/checkinQuestions';
const {rpc}=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('../auth/supabase-client',()=>({getSupabaseClient:()=>({schema:()=>({rpc})})}));
beforeEach(()=>{rpc.mockReset();rpc.mockResolvedValue({data:{questions:null,updated_at:null},error:null});});
it('ofrece sólo tres preguntas iniciales y permite crear una propia sin selector duplicado',async()=>{
 render(<CheckinQuestionLibrary org="org"/>);const user=userEvent.setup();
 await screen.findByLabelText('Incluir pregunta 1');
 expect(screen.getAllByRole('checkbox',{name:/Incluir pregunta/})).toHaveLength(3);
 expect(screen.queryByLabelText('Agregar sugerencia')).not.toBeInTheDocument();
 await user.click(screen.getByRole('button',{name:'Nueva pregunta'}));
 expect(screen.getByLabelText('Pregunta 4')).toHaveValue('Nueva pregunta');
});
it('conserva bibliotecas guardadas aunque tengan más de tres preguntas',async()=>{
 rpc.mockResolvedValue({data:{questions:Array.from({length:5},()=>newQuestion()),updated_at:'2026-09-03'},error:null});
 render(<CheckinQuestionLibrary org="org"/>);await screen.findByLabelText('Incluir pregunta 5');
 expect(screen.getAllByRole('checkbox',{name:/Incluir pregunta/})).toHaveLength(5);
});
it('todas las sugerencias son desactivables y limita a dos campanas',async()=>{
 render(<CheckinQuestionLibrary org="org"/>);const user=userEvent.setup();
 const first=await screen.findByLabelText('Incluir pregunta 1');await user.click(first);expect(first).not.toBeChecked();await user.click(first);
 const buttons=screen.getAllByRole('button',{name:'Activar alerta'});await user.click(buttons[0]!);await user.click(buttons[1]!);
 expect(screen.getAllByRole('button',{name:'Alerta activada'})).toHaveLength(2);
 for(const button of screen.getAllByRole('button',{name:'Activar alerta'}))expect(button).toBeDisabled();
});
it('archiva sin borrar la pregunta y muestra confirmación al guardar',async()=>{
 rpc.mockImplementation((name:string)=>Promise.resolve(name==='get_checkin_questions'?{data:{questions:[newQuestion()],updated_at:null},error:null}:{data:'2026-09-03T00:00:00Z',error:null}));
 render(<CheckinQuestionLibrary org="org"/>);const user=userEvent.setup();await user.click(await screen.findByRole('button',{name:'Archivar'}));
 await user.click(screen.getByRole('button',{name:'Guardar preguntas'}));
 expect(rpc).toHaveBeenCalledWith('save_checkin_questions',expect.objectContaining({p_questions:[expect.objectContaining({archived:true,enabled:false,alert:null})]}));
 expect(await screen.findByRole('status')).toHaveTextContent('Preguntas guardadas');
});
it('el paciente responde sólo el snapshot sin energía obligatoria',async()=>{
 rpc.mockResolvedValue({data:'response',error:null});const onSaved=vi.fn(async()=>{});const q=newQuestion({text:'¿Necesitás ayuda?',type:'yesno'});
 render(<QuestionCheckinForm id="id" questions={[q]} onClose={()=>{}} onSaved={onSaved}/>);const user=userEvent.setup();
 await user.selectOptions(screen.getByRole('combobox'),'Sí');await user.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Enviar respuesta'}));
 expect(rpc).toHaveBeenCalledWith('submit_question_checkin',{p_assignment:'id',p_answers:{[q.id]:'Sí'}});expect(onSaved).toHaveBeenCalled();
});
