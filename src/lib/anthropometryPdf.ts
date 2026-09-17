import type { AnthropometryReport } from './anthropometryReport';
import { formatReportNumber, signedReportNumber } from './anthropometryReport';
import { displayMeasurementDate } from './anthropometry';

function safeFilename(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
}

async function imageDataUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('No se pudo cargar el logo.');
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer el logo.'));
    reader.readAsDataURL(blob);
  });
}

function fallbackLogo(document: import('jspdf').jsPDF, x: number, y: number) {
  document.setFillColor(221, 243, 242);
  document.roundedRect(x, y, 18, 18, 3, 3, 'F');
  document.setFillColor(53, 121, 132);
  document.circle(x + 6, y + 7, 2.2, 'F');
  document.circle(x + 12, y + 7, 2.2, 'F');
  document.setDrawColor(53, 121, 132);
  document.setLineWidth(1.5);
  document.line(x + 6, y + 12, x + 12, y + 12);
}

export async function downloadAnthropometryComparisonPdf(report: AnthropometryReport) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const document = new jsPDF({ unit: 'mm', format: 'a4' });
  const dates = report.revisions.map(revision => displayMeasurementDate(revision.recorded_on));
  const pageWidth = document.internal.pageSize.getWidth();
  document.setFillColor(237, 248, 247);
  document.rect(0, 0, pageWidth, 47, 'F');
  let customLogo = false;
  if (report.logoUrl) {
    try {
      document.addImage(await imageDataUrl(report.logoUrl), 176, 10, 18, 18, undefined, 'FAST');
      customLogo = true;
    } catch { /* La identidad nunca debe impedir generar el informe. */ }
  }
  if (!customLogo) fallbackLogo(document, 176, 10);
  document.setTextColor(21, 27, 34);
  document.setFont('helvetica', 'bold');
  document.setFontSize(20);
  document.text('Informe comparativo de antropometría', 16, 19);
  document.setFont('helvetica', 'normal');
  document.setFontSize(10);
  document.setTextColor(53, 121, 132);
  document.text(report.organizationName || 'Informe clínico', 16, 28);
  document.setTextColor(102, 114, 125);
  document.text(`Paciente: ${report.patientName}`, 16, 36);
  document.text(`Profesional: ${report.professionalName || 'Profesional tratante'}`, 16, 42);

  autoTable(document, {
    startY: 54,
    theme: 'plain',
    head: [['Revisiones', 'Intervalo', 'Métricas comparables']],
    body: [[`${report.revisions.length} fechas`, `${report.elapsedDays} días`, `${report.completeMetricCount} de ${report.measuredMetricCount}`]],
    styles: { fontSize: 9, cellPadding: 3, textColor: [21, 27, 34], fillColor: [247, 249, 250] },
    headStyles: { fontStyle: 'bold', textColor: [102, 114, 125], fillColor: [247, 249, 250] },
  });

  const head = ['Métrica', `${dates[0]}\nReferencia`];
  dates.slice(1).forEach(date => head.push(`${date}\nValor · cambio`));
  const body = report.rows.map(row => [
    `${row.label} (${row.unit})`,
    formatReportNumber(row.values[0] ?? null),
    ...row.values.slice(1).map((value, index) => {
      const delta = row.deltas[index + 1] ?? null;
      const percentage = row.percentages[index + 1] ?? null;
      const change = delta === null ? 'Sin referencia' : `${signedReportNumber(delta, ` ${row.unit}`)} · ${signedReportNumber(percentage, '%')}`;
      return `${formatReportNumber(value)}\n${change}`;
    }),
  ]);
  autoTable(document, {
    startY: (document as typeof document & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ? (document as typeof document & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7 : 78,
    head: [head], body,
    styles: { fontSize: 8.5, cellPadding: 3, valign: 'middle', lineColor: [226, 233, 236], lineWidth: 0.2 },
    headStyles: { fillColor: [53, 121, 132], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [247, 249, 250] },
    columnStyles: { 0: { fontStyle: 'bold' } },
  });

  let cursor = (document as typeof document & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 9;
  if (report.includeNotes) {
    const notes = report.revisions.filter(revision => revision.note?.trim());
    if (notes.length) {
      if (cursor > 245) { document.addPage(); cursor = 20; }
      document.setFont('helvetica', 'bold'); document.setFontSize(11); document.setTextColor(21, 27, 34);
      document.text('Notas de las revisiones', 16, cursor); cursor += 6;
      document.setFont('helvetica', 'normal'); document.setFontSize(9); document.setTextColor(102, 114, 125);
      notes.forEach(revision => {
        const lines = document.splitTextToSize(`${displayMeasurementDate(revision.recorded_on)} — ${revision.note}`, pageWidth - 32) as string[];
        if (cursor + lines.length * 4.5 > 278) { document.addPage(); cursor = 20; }
        document.text(lines, 16, cursor); cursor += lines.length * 4.5 + 3;
      });
    }
  }

  const totalPages = document.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    document.setPage(page);
    document.setDrawColor(226, 233, 236); document.line(16, 282, pageWidth - 16, 282);
    document.setFontSize(7.5); document.setTextColor(102, 114, 125);
    document.text('Documento clínico confidencial · Variaciones descriptivas, sin interpretación diagnóstica.', 16, 288);
    document.text(`${page} / ${totalPages}`, pageWidth - 16, 288, { align: 'right' });
  }
  document.save(`antropometria-${safeFilename(report.patientName)}-${report.revisions.at(-1)!.recorded_on}.pdf`);
}
