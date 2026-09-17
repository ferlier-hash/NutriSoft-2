import autoTable from 'jspdf-autotable';
import { jsPDF } from 'jspdf';
import { anthropometryMetrics, displayMeasurementDate } from './anthropometry';
import { clinicalReportSections, inClinicalReportPeriod, type ClinicalReport } from './clinicalReport';

const dateTime = (value: string) => new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const number = (value: number | null | undefined, unit = '') => value == null ? '—' : `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(value)}${unit ? ` ${unit}` : ''}`;
const clean = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
async function logoData(url: string) { const response = await fetch(url); if (!response.ok) throw new Error(); const blob = await response.blob(); return await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob);}); }

export async function downloadClinicalReportPdf(report: ClinicalReport) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' }); const width = doc.internal.pageSize.getWidth();
  doc.setFillColor(237,248,247); doc.rect(0,0,width,49,'F'); let hasLogo=false;
  if(report.logoUrl)try{doc.addImage(await logoData(report.logoUrl),176,10,18,18,undefined,'FAST');hasLogo=true;}catch{/* fallback seguro */}
  if(!hasLogo){doc.setFillColor(221,243,242);doc.roundedRect(176,10,18,18,3,3,'F');doc.setFillColor(53,121,132);doc.circle(182,17,2.2,'F');doc.circle(188,17,2.2,'F');doc.setDrawColor(53,121,132);doc.setLineWidth(1.5);doc.line(182,22,188,22);}
  doc.setTextColor(21,27,34);doc.setFont('helvetica','bold');doc.setFontSize(20);doc.text('Reporte clínico',16,18);
  doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(53,121,132);doc.text(report.organizationName||'Informe clínico',16,27);
  doc.setTextColor(102,114,125);doc.text(`Paciente: ${report.data.patient.first_name} ${report.data.patient.last_name}`,16,35);doc.text(`Período: ${displayMeasurementDate(report.from)} — ${displayMeasurementDate(report.to)} · Profesional: ${report.professionalName||'Profesional tratante'}`,16,42);
  let y=57;
  const table=(title:string,head:string[],body:(string|number)[][])=>{if(!body.length)return;doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(21,27,34);doc.text(title,16,y);autoTable(doc,{startY:y+3,head:[head],body,margin:{left:16,right:16,bottom:20},styles:{fontSize:8,cellPadding:2.5,lineColor:[226,233,236],lineWidth:.2},headStyles:{fillColor:[53,121,132],textColor:255},alternateRowStyles:{fillColor:[247,249,250]}});y=(doc as typeof doc&{lastAutoTable:{finalY:number}}).lastAutoTable.finalY+9;};
  const {data}=report;
  if(report.sections.includes('profile')) table('Información y referencia',['Dato','Valor'],[['Correo',data.patient.email||'Sin informar'],['Teléfono',data.patient.phone||'Sin informar'],['Ciudad',data.patient.city||'Sin informar'],['Fecha de nacimiento',data.patient.birth_date?displayMeasurementDate(data.patient.birth_date):'Sin informar'],['Altura inicial',number(data.initial?.height_cm,'cm')],['Peso inicial',number(data.initial?.initial_weight_kg,'kg')],['Peso objetivo',number(data.initial?.target_weight_kg,'kg')]]);
  if(report.sections.includes('anthropometry')){const metrics=[...anthropometryMetrics,...data.anthropometryFields.map(field=>({key:field.id,label:field.label,unit:field.unit}))];table('Antropometría',['Fecha',...metrics.map(metric=>`${metric.label} (${metric.unit})`)],data.anthropometry.filter(row=>inClinicalReportPeriod(row.recorded_on,report.from,report.to)).map(row=>[displayMeasurementDate(row.recorded_on),...metrics.map(metric=>number(row.values[metric.key]))]));}
  if(report.sections.includes('weight'))table('Peso cotidiano',['Fecha','Peso','Origen'],data.weights.filter(row=>inClinicalReportPeriod(row.recorded_on,report.from,report.to)).map(row=>[displayMeasurementDate(row.recorded_on),number(row.weight_kg,'kg'),row.origin==='patient'?'Paciente':'Profesional']));
  if(report.sections.includes('checkins'))table('Check-ins',['Fecha','Energía','Adherencia','Ayuda',...(report.includeNotes?['Notas']:[])],data.checkins.filter(row=>inClinicalReportPeriod(row.submitted_at??row.created_at,report.from,report.to)).map(row=>[dateTime(row.submitted_at??row.created_at),number(row.energy),number(row.adherence),row.help_requested?'Sí':'No',...(report.includeNotes?[row.notes||'—']:[])]));
  if(report.sections.includes('plans'))table('Planes alimentarios',['Plan','Estado','Tipo','Publicado'],data.plans.map(row=>[row.title,row.status==='published'?'Publicado':row.status==='draft'?'Borrador':'Archivado',row.assignmentKind==='primary'?'Principal':row.assignmentKind==='complement'?'Complemento':'—',row.publishedAt?displayMeasurementDate(row.publishedAt):'—']));
  if(report.sections.includes('appointments'))table('Citas recientes',['Fecha','Modalidad','Estado'],data.appointments.filter(row=>inClinicalReportPeriod(row.starts_at,report.from,report.to)).map(row=>[dateTime(row.starts_at),row.modality==='virtual'?'Virtual':'Presencial',row.status]));
  if(y===57){doc.setFontSize(10);doc.setTextColor(102,114,125);doc.text('No hay registros para las secciones y el período seleccionados.',16,y);}
  const pages=doc.getNumberOfPages();for(let page=1;page<=pages;page++){doc.setPage(page);doc.setDrawColor(226,233,236);doc.line(16,282,width-16,282);doc.setFontSize(7.5);doc.setTextColor(102,114,125);doc.text('Documento clínico confidencial · Uso exclusivo del profesional autorizado.',16,288);doc.text(`${page} / ${pages}`,width-16,288,{align:'right'});}
  const sectionNames=clinicalReportSections.filter(([key])=>report.sections.includes(key)).map(([,label])=>label).join(', ');doc.setProperties({subject:`Secciones: ${sectionNames}`});
  doc.save(`reporte-clinico-${clean(`${data.patient.first_name}-${data.patient.last_name}`)}-${report.to}.pdf`);
}
