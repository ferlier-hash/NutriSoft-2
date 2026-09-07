import {describe,it,expect} from 'vitest';
import {inactivityDays,inactivityGroup} from '../lib/dailyFollowup';
import type {DailyPatient} from '../data/supabase/daily-followup.repository';
const p:DailyPatient={id:'x',organization_id:'y',first_name:'A',last_name:'B',source:null,last_at:null,tracking_since:null};
describe('daily activity criteria',()=>{
 it('does not invent activity for an inactive portal',()=>expect(inactivityDays(p)).toBeNull());
 it('starts at activation before first patient action',()=>expect(inactivityDays({...p,tracking_since:'2026-08-01T12:00:00Z'},new Date('2026-08-06T12:00:00Z'))).toBe(5));
 it('uses the actual action date',()=>expect(inactivityDays({...p,tracking_since:'2026-08-01T12:00:00Z',last_at:'2026-08-08T12:00:00Z'},new Date('2026-08-10T12:00:00Z'))).toBe(2));
 it('has disjoint alert bands',()=>expect([null,0,2,3,4,5,9,10,20].map(inactivityGroup)).toEqual(['unknown','recent','recent','3–4','3–4','5–9','5–9','10+','10+']));
});
