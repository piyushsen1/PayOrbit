import { Request, Response, NextFunction } from 'express';
import * as holidayService from '../services/holiday.service';
import { parsePagination } from '../utils/pagination';

export async function listHolidaysHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const pagination = parsePagination(req.query as { page?: number; limit?: number });
    const year = typeof req.query.year === 'string' ? Number(req.query.year) : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const { items, meta } = await holidayService.listHolidays({ year, search }, pagination);
    res.success(items, 200, meta);
  } catch (err) {
    next(err);
  }
}

export async function getHolidayHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const holiday = await holidayService.getHoliday(req.params.id);
    res.success(holiday);
  } catch (err) {
    next(err);
  }
}

export async function createHolidayHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const holiday = await holidayService.createHoliday(req.body);
    res.success(holiday, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateHolidayHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const holiday = await holidayService.updateHoliday(req.params.id, req.body);
    res.success(holiday);
  } catch (err) {
    next(err);
  }
}

export async function deleteHolidayHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await holidayService.deleteHoliday(req.params.id);
    res.success(null);
  } catch (err) {
    next(err);
  }
}
