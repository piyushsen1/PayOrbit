import 'reflect-metadata';
import bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';
import { AppDataSource } from './config/data-source';
import { User, UserRole } from './entities/User';
import { Employee } from './entities/Employee';
import { WorkingSchedule } from './entities/WorkingSchedule';
import { DayOfWeek, WorkingScheduleDay } from './entities/WorkingScheduleDay';
import { TimeOffType, TimeOffUnit } from './entities/TimeOffType';
import { SalaryStructure } from './entities/SalaryStructure';
import { SalaryRule, SalaryRuleCategory, SalaryRuleComputationMethod } from './entities/SalaryRule';
import { Contract } from './entities/Contract';
import { Attendance, AttendanceStatus } from './entities/Attendance';
import { TimeOffAllocation, TimeOffAllocationStatus } from './entities/TimeOffAllocation';
import { TimeOffRequest, TimeOffRequestStatus } from './entities/TimeOffRequest';
import * as payRunService from './services/pay-run.service';

const SALT_ROUNDS = 10;
const USERS_TO_SEED = 10;
const SEED_PASSWORD = 'Password123!';

/** One linked Employee+User pair per role, for demoing the User Management screen. */
const DEMO_ACCOUNTS: Array<{ fullName: string; jobPosition: string; department: string; role: UserRole }> = [
  { fullName: 'Aarav Mehta', jobPosition: 'Payroll Specialist', department: 'Finance', role: UserRole.HR_PAYROLL_USER },
  { fullName: 'Maya Shah', jobPosition: 'HR Officer', department: 'HR', role: UserRole.HR_MANAGER },
  { fullName: 'Rohan Patel', jobPosition: 'Developer', department: 'Engineering', role: UserRole.EMPLOYEE },
  { fullName: 'Nisha Rao', jobPosition: 'Payroll Manager', department: 'Finance', role: UserRole.HR_PAYROLL_MANAGER },
];

/**
 * Idempotent-ish dev seed: run against a fresh, migrated database. Goes
 * through the real repository (not raw SQL) so entity hooks/validation stay
 * in effect, same as request-time writes.
 */
async function seed() {
  await AppDataSource.initialize();
  const userRepository = AppDataSource.getRepository(User);
  const employeeRepository = AppDataSource.getRepository(Employee);
  const workingScheduleRepository = AppDataSource.getRepository(WorkingSchedule);
  const timeOffTypeRepository = AppDataSource.getRepository(TimeOffType);
  const salaryStructureRepository = AppDataSource.getRepository(SalaryStructure);
  const salaryRuleRepository = AppDataSource.getRepository(SalaryRule);
  const contractRepository = AppDataSource.getRepository(Contract);
  const attendanceRepository = AppDataSource.getRepository(Attendance);
  const timeOffAllocationRepository = AppDataSource.getRepository(TimeOffAllocation);
  const timeOffRequestRepository = AppDataSource.getRepository(TimeOffRequest);

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, SALT_ROUNDS);

  const weekdays = [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY];
  const standardSchedule = await workingScheduleRepository.save(
    workingScheduleRepository.create({
      name: 'Standard 40h/Week',
      company: 'PayOrbit',
      timezone: 'UTC',
      weeklyHours: '40.00',
      days: weekdays.map((dayOfWeek) =>
        Object.assign(new WorkingScheduleDay(), { dayOfWeek, startTime: '09:00', endTime: '18:00', breakMinutes: 60 })
      ),
    })
  );
  console.log('Seeded 1 working schedule (Standard 40h/Week).');

  const DEMO_TIME_OFF_TYPES: Array<{
    name: string;
    unit: TimeOffUnit;
    allocationRequired: boolean;
    approvalRole: UserRole;
    affectsPayroll: boolean;
    color: string;
  }> = [
    { name: 'Paid Time Off', unit: TimeOffUnit.DAYS, allocationRequired: true, approvalRole: UserRole.HR_MANAGER, affectsPayroll: true, color: '#3B82F6' },
    { name: 'Sick Leave', unit: TimeOffUnit.DAYS, allocationRequired: false, approvalRole: UserRole.HR_MANAGER, affectsPayroll: true, color: '#EF4444' },
    { name: 'Unpaid Leave', unit: TimeOffUnit.DAYS, allocationRequired: false, approvalRole: UserRole.HR_PAYROLL_MANAGER, affectsPayroll: false, color: '#6B7280' },
  ];
  const savedTimeOffTypes = await timeOffTypeRepository.save(DEMO_TIME_OFF_TYPES.map((type) => timeOffTypeRepository.create(type)));
  const ptoType = savedTimeOffTypes.find((t) => t.name === 'Paid Time Off')!;
  console.log(`Seeded ${DEMO_TIME_OFF_TYPES.length} time off types.`);

  const standardStructure = await salaryStructureRepository.save(
    salaryStructureRepository.create({ name: 'Standard Structure', active: true })
  );
  await salaryRuleRepository.save([
    salaryRuleRepository.create({
      name: 'Basic Salary',
      code: 'BASIC',
      category: SalaryRuleCategory.BASIC,
      sequence: 10,
      salaryStructureId: standardStructure.id,
      computationMethod: SalaryRuleComputationMethod.FIXED,
      value: '30000.00',
    }),
    salaryRuleRepository.create({
      name: 'House Rent Allowance',
      code: 'HRA',
      category: SalaryRuleCategory.ALLOWANCE,
      sequence: 20,
      salaryStructureId: standardStructure.id,
      computationMethod: SalaryRuleComputationMethod.PERCENTAGE,
      value: '40.00',
    }),
    salaryRuleRepository.create({
      name: 'Income Tax',
      code: 'TAX',
      category: SalaryRuleCategory.DEDUCTION,
      sequence: 30,
      salaryStructureId: standardStructure.id,
      computationMethod: SalaryRuleComputationMethod.PERCENTAGE,
      value: '10.00',
    }),
  ]);
  console.log('Seeded 1 salary structure (Standard Structure) with 3 rules.');

  const admin = userRepository.create({
    email: 'admin@example.com',
    passwordHash,
    role: UserRole.ADMIN,
  });

  const employeesByName: Record<string, Employee> = {};
  for (const account of DEMO_ACCOUNTS) {
    const workEmail = `${account.fullName.toLowerCase().replace(/\s+/g, '.')}@company.com`;
    const employee = await employeeRepository.save(
      employeeRepository.create({
        fullName: account.fullName,
        workEmail,
        jobPosition: account.jobPosition,
        department: account.department,
        workingScheduleId: standardSchedule.id,
      })
    );
    employeesByName[account.fullName] = employee;
    await userRepository.save(
      userRepository.create({
        email: workEmail,
        passwordHash,
        role: account.role,
        employeeId: employee.id,
      })
    );
  }
  console.log(`Seeded ${DEMO_ACCOUNTS.length} employees with linked user accounts (one per role).`);

  const DEMO_CONTRACTS: Array<{ employeeName: string; startDate: string; endDate: string | null; wagePerMonth: string }> = [
    { employeeName: 'Aarav Mehta', startDate: '2025-07-01', endDate: '2025-12-31', wagePerMonth: '78000.00' },
    { employeeName: 'Aarav Mehta', startDate: '2026-01-01', endDate: null, wagePerMonth: '85000.00' },
    { employeeName: 'Maya Shah', startDate: '2026-01-01', endDate: null, wagePerMonth: '95000.00' },
    { employeeName: 'Nisha Rao', startDate: '2026-01-01', endDate: null, wagePerMonth: '110000.00' },
    { employeeName: 'Rohan Patel', startDate: '2026-02-01', endDate: null, wagePerMonth: '65000.00' },
  ];
  let contractSequence = 0;
  await contractRepository.save(
    DEMO_CONTRACTS.map((c) => {
      const employee = employeesByName[c.employeeName];
      contractSequence += 1;
      return contractRepository.create({
        contractNumber: `CON/${new Date(c.startDate).getFullYear()}/${String(contractSequence).padStart(4, '0')}`,
        employeeId: employee.id,
        department: employee.department,
        jobPosition: employee.jobPosition,
        startDate: c.startDate,
        endDate: c.endDate,
        wagePerMonth: c.wagePerMonth,
        workingScheduleId: standardSchedule.id,
        salaryStructureId: standardStructure.id,
        notes: c.endDate ? 'Superseded by a later contract.' : 'Running contract — source for payroll in the active period.',
      });
    })
  );
  console.log(`Seeded ${DEMO_CONTRACTS.length} contracts.`);

  const today = new Date();
  const isoDate = (daysAgo: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  };
  const DEMO_ATTENDANCE: Array<{ employeeName: string; daysAgo: number; checkInHour: number; checkOutHour: number }> = [
    { employeeName: 'Rohan Patel', daysAgo: 1, checkInHour: 9, checkOutHour: 18 },
    { employeeName: 'Rohan Patel', daysAgo: 2, checkInHour: 9, checkOutHour: 20 },
    { employeeName: 'Aarav Mehta', daysAgo: 1, checkInHour: 9, checkOutHour: 17 },
  ];
  await attendanceRepository.save(
    DEMO_ATTENDANCE.map(({ employeeName, daysAgo, checkInHour, checkOutHour }) => {
      const employee = employeesByName[employeeName];
      const date = isoDate(daysAgo);
      return attendanceRepository.create({
        employeeId: employee.id,
        date,
        checkIn: new Date(`${date}T${String(checkInHour).padStart(2, '0')}:00:00Z`),
        checkOut: new Date(`${date}T${String(checkOutHour).padStart(2, '0')}:00:00Z`),
        status: AttendanceStatus.PRESENT,
      });
    })
  );
  console.log(`Seeded ${DEMO_ATTENDANCE.length} attendance records.`);

  const rohanAllocation = await timeOffAllocationRepository.save(
    timeOffAllocationRepository.create({
      employeeId: employeesByName['Rohan Patel'].id,
      timeOffTypeId: ptoType.id,
      allocated: '10.00',
      status: TimeOffAllocationStatus.APPROVED,
    })
  );
  await timeOffAllocationRepository.save(
    timeOffAllocationRepository.create({
      employeeId: employeesByName['Aarav Mehta'].id,
      timeOffTypeId: ptoType.id,
      allocated: '12.00',
      status: TimeOffAllocationStatus.APPROVED,
    })
  );
  console.log('Seeded 2 approved time off allocations (Paid Time Off).');

  await timeOffRequestRepository.save(
    timeOffRequestRepository.create({
      employeeId: employeesByName['Rohan Patel'].id,
      timeOffTypeId: ptoType.id,
      allocationId: rohanAllocation.id,
      startDate: '2026-10-01',
      endDate: '2026-10-03',
      duration: '3.00',
      status: TimeOffRequestStatus.APPROVED,
      reason: 'Family trip',
    })
  );
  console.log('Seeded 1 approved time off request.');

  const januaryPayRun = await payRunService.createPayRun({
    name: 'January 2026',
    salaryStructureId: standardStructure.id,
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    employeeIds: [employeesByName['Maya Shah'].id, employeesByName['Nisha Rao'].id],
  });
  await payRunService.computePayRun(januaryPayRun.id);
  await payRunService.validatePayRun(januaryPayRun.id);
  await payRunService.markPayRunPaid(januaryPayRun.id);
  console.log('Seeded 1 paid pay run (January 2026) with 2 payslips.');

  const users = Array.from({ length: USERS_TO_SEED }, () =>
    userRepository.create({
      email: faker.internet.email().toLowerCase(),
      passwordHash,
      role: UserRole.EMPLOYEE,
    })
  );

  await userRepository.save([admin, ...users]);

  console.log(`Seeded ${users.length + 1} users (including 1 admin).`);
  console.log(`All seeded accounts use the password: ${SEED_PASSWORD}`);

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
