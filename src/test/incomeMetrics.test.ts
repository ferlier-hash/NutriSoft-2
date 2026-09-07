import { describe, expect, it } from 'vitest';
import { incomeMetrics, incomeMonths, monthlyIncome, type IncomeAppointment, type IncomeMovement } from '../lib/realIncome';
const cita: IncomeAppointment = { id:'a', patient_id:'p', starts_at:'2026-09-20T12:00:00Z',time_zone:'America/Argentina/Cordoba',quoted_amount:100,currency:'ARS',payment_status:'partial',status:'confirmed',modality:'virtual' };
const payment: IncomeMovement = {id:'m',appointment_id:'a',amount:40,currency:'ARS',movement_kind:'payment',method:'cash',note:null,occurred_at:'2026-08-31T23:00:00Z',refunded_payment_id:null};
describe('Ingresos reales',()=>{
 it('separa métricas y excluye citas reprogramadas del proyectado',()=>{
  const rows=[cita,{...cita,id:'b',status:'cancelled_by_patient',payment_status:'no_charge'},{...cita,id:'c',status:'rescheduled',payment_status:'no_charge'}];
  expect(incomeMetrics(rows,[payment],new Date('2026-09-01'))).toEqual({paid:40,pending:60,partial:60,projected:100,lost:100});
 });
 it('incluye meses sin datos y muestra devoluciones en su mes, incluso negativas',()=>{
  const refund={...payment,id:'r',movement_kind:'refund',occurred_at:'2026-09-03T12:00:00Z',refunded_payment_id:'m'};
  const rows=monthlyIncome(incomeMonths('2026-07','2026-09')!,[cita],[payment,refund]);
  expect(rows.map(r=>r.paid)).toEqual([0,40,-40]);
  expect(rows[2]?.pending).toBe(100);
 });
 it('respeta fecha civil cerca del cambio de mes y no agrega movimientos ajenos',()=>{
  const rows=monthlyIncome(['2026-08','2026-09'],[cita],[{...payment,occurred_at:'2026-09-01T01:00:00Z'},{...payment,id:'other',appointment_id:'other',amount:900}]);
  expect(rows.map(r=>r.paid)).toEqual([40,0]);
 });
 it('valida rangos y cruza año',()=>{
  expect(incomeMonths('2025-12','2026-02')).toEqual(['2025-12','2026-01','2026-02']);
  expect(incomeMonths('2026-02','2026-01')).toBeNull();
  expect(incomeMonths('2026-13','2027-01')).toBeNull();
  expect(incomeMonths('2000-01','2026-01')).toBeNull();
 });
});
