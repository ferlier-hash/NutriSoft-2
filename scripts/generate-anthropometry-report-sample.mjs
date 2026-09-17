import { mkdirSync, writeFileSync } from 'node:fs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const output = new URL('../output/pdf/informe-comparativo-antropometria-ejemplo.pdf', import.meta.url);
mkdirSync(new URL('../output/pdf/', import.meta.url), { recursive: true });
const document = new jsPDF({ unit: 'mm', format: 'a4' });
const width = document.internal.pageSize.getWidth();
document.setFillColor(237, 248, 247); document.rect(0, 0, width, 47, 'F');
document.setTextColor(21, 27, 34); document.setFont('helvetica', 'bold'); document.setFontSize(20);
document.text('Informe comparativo de antropometría', 16, 19);
document.setFont('helvetica', 'normal'); document.setFontSize(10); document.setTextColor(53, 121, 132);
document.text('Consultorio NutriSoft · documento de ejemplo', 16, 28);
document.setTextColor(102, 114, 125); document.text('Paciente: Paciente de ejemplo', 16, 36); document.text('Profesional: Lic. Andrea Ejemplo', 16, 42);
autoTable(document, { startY: 54, theme: 'plain', head: [['Revisiones', 'Intervalo', 'Métricas comparables']], body: [['3 fechas', '60 días', '6 de 7']], styles: { fontSize: 9, cellPadding: 3, textColor: [21,27,34], fillColor: [247,249,250] }, headStyles: { fontStyle: 'bold', textColor: [102,114,125], fillColor: [247,249,250] } });
autoTable(document, { startY: document.lastAutoTable.finalY + 7, head: [['Métrica', '1/6/2026\nReferencia', '1/7/2026\nValor · cambio', '31/7/2026\nValor · cambio']], body: [
  ['Peso (kg)', '78,4', '76,9\n-1,5 kg · -1,91%', '75,8\n-2,6 kg · -3,32%'],
  ['Cintura (cm)', '94', '92\n-2 cm · -2,13%', '90,5\n-3,5 cm · -3,72%'],
  ['Cadera (cm)', '104', '103', '102\n-2 cm · -1,92%'],
  ['Brazo (cm)', '31,2', '30,9\n-0,3 cm · -0,96%', '30,8\n-0,4 cm · -1,28%'],
  ['Grasa corporal (%)', '34,5', '33,8\n-0,7 % · -2,03%', '33,1\n-1,4 % · -4,06%'],
  ['Masa muscular (kg)', '27,6', '27,9\n+0,3 kg · +1,09%', '28,1\n+0,5 kg · +1,81%'],
  ['Pliegue tricipital (mm)', '22', '—\nSin referencia', '20\n-2 mm · -9,09%'],
], styles: { fontSize: 8.5, cellPadding: 3, valign: 'middle', lineColor: [226,233,236], lineWidth: 0.2 }, headStyles: { fillColor: [53,121,132], textColor: 255, fontStyle: 'bold' }, alternateRowStyles: { fillColor: [247,249,250] }, columnStyles: { 0: { fontStyle: 'bold' } } });
document.setDrawColor(226,233,236); document.line(16,282,width-16,282); document.setFontSize(7.5); document.setTextColor(102,114,125);
document.text('Documento clínico confidencial · Variaciones descriptivas, sin interpretación diagnóstica.',16,288); document.text('1 / 1',width-16,288,{align:'right'});
writeFileSync(output, Buffer.from(document.output('arraybuffer')));
console.log(output.pathname);
