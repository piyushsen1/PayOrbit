import PDFDocument from 'pdfkit';
import { Payslip } from '../entities/Payslip';

/** Renders one Payslip (with its lines/employee/payRun relations loaded) to a PDF buffer for download or email attachment. */
export function generatePayslipPdf(payslip: Payslip): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text('Payslip', { align: 'center' });
    doc.moveDown();

    doc.fontSize(11);
    doc.text(`Employee: ${payslip.employee?.fullName ?? '—'}`);
    doc.text(`Pay Run: ${payslip.payRun?.name ?? '—'}`);
    doc.text(`Period: ${payslip.payRun?.periodStart ?? '—'} to ${payslip.payRun?.periodEnd ?? '—'}`);
    doc.text(`Status: ${payslip.status}`);
    doc.text(`Worked Days: ${payslip.workedDays ?? '—'}`);
    if (payslip.warning) {
      doc.fillColor('red').text(`Warning: ${payslip.warning}`).fillColor('black');
    }
    doc.moveDown();

    doc.fontSize(12).text('Salary Rules', { underline: true });
    doc.moveDown(0.5);
    const lines = payslip.lines ?? [];
    lines.forEach((line) => {
      doc.fontSize(10).text(`${line.name} (${line.code}) — ${line.category}`, { continued: true }).text(
        Number(line.amount).toFixed(2),
        { align: 'right' }
      );
    });
    doc.moveDown();

    doc.fontSize(11);
    doc.text(`Basic: ${payslip.basic ?? '0.00'}`, { align: 'right' });
    doc.text(`Gross: ${payslip.grossTotal ?? '0.00'}`, { align: 'right' });
    doc.text(`Net: ${payslip.netTotal ?? '0.00'}`, { align: 'right' });

    doc.end();
  });
}
