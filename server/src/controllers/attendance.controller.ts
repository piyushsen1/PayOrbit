import { Request, Response, NextFunction } from 'express';
import * as attendanceService from '../services/attendance.service';
import { getLinkedEmployeeId } from '../services/auth.service';
import { UserRole } from '../entities/User';
import { AppError } from '../utils/AppError';
import { ErrorCodes } from '../utils/error-codes';
import { parsePagination } from '../utils/pagination';
import { AttendanceStatus } from '../entities/Attendance';

const HR_ROLES = [UserRole.HR_MANAGER, UserRole.HR_PAYROLL_USER, UserRole.HR_PAYROLL_MANAGER, UserRole.ADMIN];

export async function listAttendanceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const isHr = !!req.user && HR_ROLES.includes(req.user.role);
    const queryEmployeeId = typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined;
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const status = typeof req.query.status === 'string' ? (req.query.status as AttendanceStatus) : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    // Employees (non-HR) only ever see their own attendance, regardless of what they pass in the query.
    const employeeId = isHr ? queryEmployeeId : await getLinkedEmployeeId(req.user!.sub);
    const pagination = parsePagination(req.query as { page?: number; limit?: number });

    const { items, meta } = await attendanceService.listAttendance({ employeeId, date, status, search }, pagination);
    res.success(items, 200, meta);
  } catch (err) {
    next(err);
  }
}

export async function getAttendanceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const record = await attendanceService.getAttendance(req.params.id);
    res.success(record);
  } catch (err) {
    next(err);
  }
}

export async function createAttendanceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const record = await attendanceService.createAttendance(req.body);
    res.success(record, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateAttendanceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const record = await attendanceService.updateAttendance(req.params.id, req.body);
    res.success(record);
  } catch (err) {
    next(err);
  }
}

export async function deleteAttendanceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await attendanceService.deleteAttendance(req.params.id);
    res.success(null);
  } catch (err) {
    next(err);
  }
}

export async function getTodayAttendanceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError(ErrorCodes.UNAUTHORIZED, 'Authentication required.', 401);
    const employeeId = await getLinkedEmployeeId(req.user.sub);
    const record = await attendanceService.getTodayAttendance(employeeId);
    res.success(record);
  } catch (err) {
    next(err);
  }
}

export async function checkInHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError(ErrorCodes.UNAUTHORIZED, 'Authentication required.', 401);
    const employeeId = await getLinkedEmployeeId(req.user.sub);
    const record = await attendanceService.checkIn(employeeId);
    res.success(record);
  } catch (err) {
    next(err);
  }
}

export async function checkOutHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError(ErrorCodes.UNAUTHORIZED, 'Authentication required.', 401);
    const employeeId = await getLinkedEmployeeId(req.user.sub);
    const record = await attendanceService.checkOut(employeeId);
    res.success(record);
  } catch (err) {
    next(err);
  }
}
