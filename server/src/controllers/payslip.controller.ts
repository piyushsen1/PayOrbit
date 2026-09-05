import { Request, Response, NextFunction } from 'express';
import * as payslipService from '../services/payslip.service';

export async function listPayslipsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const employeeId = typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined;
    const payRunId = typeof req.query.payRunId === 'string' ? req.query.payRunId : undefined;
    const payslips = await payslipService.listPayslips({ employeeId, payRunId });
    res.success(payslips);
  } catch (err) {
    next(err);
  }
}

export async function getPayslipHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const payslip = await payslipService.getPayslip(req.params.id);
    res.success(payslip);
  } catch (err) {
    next(err);
  }
}

export async function getPayslipPdfHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const pdf = await payslipService.getPayslipPdf(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="payslip-${req.params.id}.pdf"`);
    res.send(pdf);
  } catch (err) {
    next(err);
  }
}

export async function markPayslipPaidHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const payslip = await payslipService.markPayslipPaid(req.params.id);
    res.success(payslip);
  } catch (err) {
    next(err);
  }
}
