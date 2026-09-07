import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {it,expect} from 'vitest';
import {CheckinHistoryEntry} from '../components/domain/CheckinHistoryEntry';
import type {DailyCheckin} from '../data/supabase/daily-followup.repository';
const value:DailyCheckin={id:'a',patient_id:'p',status:'completed',due_date:null,created_at:'2026-09-04T12:00:00Z',submitted_at:'2026-09-04T12:00:00Z',daily_fields:[],energy:2,adherence:4,help_requested:false,notes:'Comentario de prueba',answers:null};
it('permite plegado independiente y conserva el contenido del historial',async()=>{
 render(<><CheckinHistoryEntry value={value} initiallyOpen/><CheckinHistoryEntry value={{...value,id:'b',created_at:'2026-09-03T12:00:00Z',submitted_at:'2026-09-03T12:00:00Z'}}/></>);
 const buttons=screen.getAllByRole('button');expect(buttons[0]).toHaveAttribute('aria-expanded','true');expect(buttons[1]).toHaveAttribute('aria-expanded','false');
 const user=userEvent.setup();await user.click(buttons[1]!);expect(buttons[0]).toHaveAttribute('aria-expanded','true');expect(buttons[1]).toHaveAttribute('aria-expanded','true');
 await user.click(buttons[0]!);expect(buttons[0]).toHaveAttribute('aria-expanded','false');expect(screen.getAllByText('Comentario de prueba')[1]).toBeVisible();
});
