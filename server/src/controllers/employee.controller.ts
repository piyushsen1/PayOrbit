import { Request, Response, NextFunction } from 'express';
import * as employeeService from '../services/employee.service';
import { parsePagination } from '../utils/pagination';

export async function listEmployeesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const status = typeof req.query.status === 'string' ? (req.query.status as employeeService.EmployeeStatusFilter) : undefined;
    const pagination = parsePagination(req.query as { page?: number; limit?: number });
    const { items, meta } = await employeeService.listEmployees({ search, status }, pagination);
    res.success(items, 200, meta);
  } catch (err) {
    next(err);
  }
}

export async function getEmployeeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const employee = await employeeService.getEmployee(req.params.id);
    res.success(employee);
  } catch (err) {
    next(err);
  }
}

export async function createEmployeeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const employee = await employeeService.createEmployee(req.body);
    res.success(employee, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateEmployeeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const employee = await employeeService.updateEmployee(req.params.id, req.body);
    res.success(employee);
  } catch (err) {
    next(err);
  }
}

export async function deleteEmployeeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await employeeService.deleteEmployee(req.params.id);
    res.success(null);
  } catch (err) {
    next(err);
  }
}

export async function getEmployeeFilterOptionsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const options = await employeeService.getEmployeeFilterOptions();
    res.success(options);
  } catch (err) {
    next(err);
  }
}
