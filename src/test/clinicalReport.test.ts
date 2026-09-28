import { expect, it } from 'vitest';
import { clinicalReportFacts, inClinicalReportPeriod, reportEntryCount, reportNextSteps, type ClinicalReport } from '../lib/clinicalReport';

it('filtra el período de forma inclusiva y cuenta sólo secciones elegidas', () => {
  expect(inClinicalReportPeriod('2026-09-01T23:00:00Z','2026-09-01','2026-09-30')).toBe(true);
  const report={from:'2026-09-01',to:'2026-09-30',sections:['weight','checkins'],includeNotes:false,includeContactDetails:false,objective:'',professionalSummary:'',nextSteps:'',data:{
    patient:{id:'p',organization_id:'o',first_name:'Ada',last_name:'Paciente',email:null,phone:null,birth_date:null,city:null,status:'active'},initial:null,anthropometry:[],anthropometryFields:[],plans:[],appointments:[],
    weights:[{id:'w1',patient_id:'p',recorded_on:'2026-09-01',weight_kg:70,origin:'patient',created_at:'2026-09-01'}],
    checkins:[{id:'c1',patient_id:'p',status:'answered',due_date:null,created_at:'2026-10-01T00:00:00Z',daily_fields:[],energy:null,adherence:null,help_requested:null,notes:null,submitted_at:null,answers:null,questions:null,question_answers:null,alert_matches:null}],
  }} as ClinicalReport;
  expect(reportEntryCount(report)).toBe(1);
  expect(clinicalReportFacts(report)).toMatchObject({weightCount:1,checkinCount:0,helpRequestCount:0,activePlanCount:0});
  expect(clinicalReportFacts({...report,sections:['profile']})).toMatchObject({weightCount:0,checkinCount:0,appointmentCount:0,activePlanCount:0});
  expect(reportNextSteps('Controlar tolerancia\n\n Revisar plan ')).toEqual(['Controlar tolerancia','Revisar plan']);
});
