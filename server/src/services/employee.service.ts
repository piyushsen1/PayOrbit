import { AppDataSource } from '../config/data-source';
import { Employee, EmployeeStatus, EmployeeType } from '../entities/Employee';
import { WorkingSchedule } from '../entities/WorkingSchedule';
import { AppError } from '../utils/AppError';
import { ErrorCodes } from '../utils/error-codes';
import { parsePagination, buildPaginationMeta, type PaginationParams } from '../utils/pagination';

const employeeRepository = () => AppDataSource.getRepository(Employee);
const workingScheduleRepository = () => AppDataSource.getRepository(WorkingSchedule);

export interface EmployeeInput {
  fullName: string;
  workEmail: string;
  jobPosition?: string | null;
  department?: string | null;
  status?: EmployeeStatus;
  employeeType?: EmployeeType;
  managerId?: string | null;
  workingScheduleId?: string | null;
  workLocation?: string | null;
  company?: string | null;
  phone?: string | null;
  personalEmail?: string | null;
  homeAddress?: string | null;
  dateOfBirth?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  bankAccountNumber?: string | null;
}

async function assertManagerExists(managerId: string) {
  const manager = await employeeRepository().findOne({ where: { id: managerId } });
  if (!manager) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Selected manager does not exist.', 404);
  }
}

async function assertWorkingScheduleExists(workingScheduleId: string) {
  const schedule = await workingScheduleRepository().findOne({ where: { id: workingScheduleId } });
  if (!schedule) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Selected working schedule does not exist.', 404);
  }
}

export async function listEmployees(pagination: PaginationParams = parsePagination({})) {
  const [items, total] = await employeeRepository().findAndCount({
    order: { fullName: 'ASC' },
    skip: pagination.skip,
    take: pagination.take,
  });
  return { items, meta: buildPaginationMeta(pagination, total) };
}

export async function getEmployee(id: string) {
  const employee = await employeeRepository().findOne({ where: { id } });
  if (!employee) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Employee not found.', 404);
  }
  return employee;
}

export async function createEmployee(input: EmployeeInput) {
  if (input.managerId) await assertManagerExists(input.managerId);
  if (input.workingScheduleId) await assertWorkingScheduleExists(input.workingScheduleId);

  const repo = employeeRepository();
  const employee = repo.create({
    fullName: input.fullName,
    workEmail: input.workEmail,
    jobPosition: input.jobPosition ?? null,
    department: input.department ?? null,
    employeeType: input.employeeType ?? EmployeeType.FULL_TIME,
    managerId: input.managerId ?? null,
    workingScheduleId: input.workingScheduleId ?? null,
    workLocation: input.workLocation ?? null,
    company: input.company ?? null,
    phone: input.phone ?? null,
    personalEmail: input.personalEmail ?? null,
    homeAddress: input.homeAddress ?? null,
    dateOfBirth: input.dateOfBirth ?? null,
    emergencyContactName: input.emergencyContactName ?? null,
    emergencyContactPhone: input.emergencyContactPhone ?? null,
    bankAccountNumber: input.bankAccountNumber ?? null,
  });
  return repo.save(employee);
}

export async function updateEmployee(id: string, input: Partial<EmployeeInput>) {
  const repo = employeeRepository();
  const employee = await repo.findOne({ where: { id } });
  if (!employee) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Employee not found.', 404);
  }

  if (input.managerId !== undefined) {
    if (input.managerId === id) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'An employee cannot be their own manager.', 422);
    }
    if (input.managerId) await assertManagerExists(input.managerId);
    employee.managerId = input.managerId;
  }
  if (input.workingScheduleId !== undefined) {
    if (input.workingScheduleId) await assertWorkingScheduleExists(input.workingScheduleId);
    employee.workingScheduleId = input.workingScheduleId;
  }

  if (input.fullName !== undefined) employee.fullName = input.fullName;
  if (input.workEmail !== undefined) employee.workEmail = input.workEmail;
  if (input.jobPosition !== undefined) employee.jobPosition = input.jobPosition;
  if (input.department !== undefined) employee.department = input.department;
  if (input.status !== undefined) employee.status = input.status;
  if (input.employeeType !== undefined) employee.employeeType = input.employeeType;
  if (input.workLocation !== undefined) employee.workLocation = input.workLocation;
  if (input.company !== undefined) employee.company = input.company;
  if (input.phone !== undefined) employee.phone = input.phone;
  if (input.personalEmail !== undefined) employee.personalEmail = input.personalEmail;
  if (input.homeAddress !== undefined) employee.homeAddress = input.homeAddress;
  if (input.dateOfBirth !== undefined) employee.dateOfBirth = input.dateOfBirth;
  if (input.emergencyContactName !== undefined) employee.emergencyContactName = input.emergencyContactName;
  if (input.emergencyContactPhone !== undefined) employee.emergencyContactPhone = input.emergencyContactPhone;
  if (input.bankAccountNumber !== undefined) employee.bankAccountNumber = input.bankAccountNumber;

  return repo.save(employee);
}

export async function deleteEmployee(id: string) {
  const repo = employeeRepository();
  const result = await repo.delete(id);
  if (!result.affected) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Employee not found.', 404);
  }
}
