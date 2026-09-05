import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboard.service';
import { EmployeeType } from '../entities/Employee';

/** Defaults to the current calendar month when no period is given. */
function defaultPeriod() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return { periodStart: start.toISOString().slice(0, 10), periodEnd: end.toISOString().slice(0, 10) };
}

export async function getDashboardHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const defaults = defaultPeriod();
    const periodStart = typeof req.query.periodStart === 'string' ? req.query.periodStart : defaults.periodStart;
    const periodEnd = typeof req.query.periodEnd === 'string' ? req.query.periodEnd : defaults.periodEnd;
    const department = typeof req.query.department === 'string' ? req.query.department : undefined;
    const company = typeof req.query.company === 'string' ? req.query.company : undefined;
    const employeeType =
      typeof req.query.employeeType === 'string' ? (req.query.employeeType as EmployeeType) : undefined;

    const dashboard = await dashboardService.getDashboard({ periodStart, periodEnd, department, company, employeeType });
    res.success(dashboard);
  } catch (err) {
    next(err);
  }
}
