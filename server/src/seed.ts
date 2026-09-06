import 'reflect-metadata';
import bcrypt from 'bcrypt';
import { fakerEN_IN as faker } from '@faker-js/faker';
import { AppDataSource } from './config/data-source';
import { User, UserRole, UserStatus } from './entities/User';
import { Employee, EmployeeStatus, EmployeeType } from './entities/Employee';
import { WorkingSchedule } from './entities/WorkingSchedule';
import { DayOfWeek, WorkingScheduleDay } from './entities/WorkingScheduleDay';
import { TimeOffType, TimeOffUnit } from './entities/TimeOffType';
import { SalaryStructure } from './entities/SalaryStructure';
import { SalaryRule, SalaryRuleCategory, SalaryRuleComputationMethod } from './entities/SalaryRule';
import { Contract } from './entities/Contract';
import { Attendance, AttendanceStatus } from './entities/Attendance';
import { TimeOffAllocation, TimeOffAllocationStatus } from './entities/TimeOffAllocation';
import { TimeOffRequest, TimeOffRequestStatus } from './entities/TimeOffRequest';
import { Holiday } from './entities/Holiday';
import * as payRunService from './services/pay-run.service';

const SALT_ROUNDS = 10;
const SEED_PASSWORD = 'Password123!';

faker.seed(20260906);
const chance = () => faker.number.float({ min: 0, max: 1 });

/** One linked Employee+User pair per role, for demoing the User Management screen. */
const DEMO_ACCOUNTS: Array<{ fullName: string; jobPosition: string; department: string; role: UserRole }> = [
  { fullName: 'Aarav Mehta', jobPosition: 'Payroll Specialist', department: 'Finance', role: UserRole.HR_PAYROLL_USER },
  { fullName: 'Maya Shah', jobPosition: 'HR Officer', department: 'HR', role: UserRole.HR_MANAGER },
  { fullName: 'Rohan Patel', jobPosition: 'Developer', department: 'Engineering', role: UserRole.EMPLOYEE },
  { fullName: 'Nisha Rao', jobPosition: 'Payroll Manager', department: 'Finance', role: UserRole.HR_PAYROLL_MANAGER },
];

/** Departments to populate with generated employees, each with its own manager + staff positions. */
const DEPARTMENTS: Array<{ name: string; managerTitle: string; positions: string[]; staffCount: number }> = [
  { name: 'Engineering', managerTitle: 'Engineering Manager', positions: ['Software Engineer', 'Senior Software Engineer', 'QA Engineer', 'DevOps Engineer'], staffCount: 13 },
  { name: 'Product', managerTitle: 'Head of Product', positions: ['Product Manager', 'Product Analyst'], staffCount: 5 },
  { name: 'Design', managerTitle: 'Design Lead', positions: ['UI/UX Designer', 'Product Designer'], staffCount: 4 },
  { name: 'Sales', managerTitle: 'Sales Manager', positions: ['Sales Executive', 'Account Manager'], staffCount: 9 },
  { name: 'Marketing', managerTitle: 'Marketing Manager', positions: ['Marketing Specialist', 'Content Strategist'], staffCount: 6 },
  { name: 'Finance', managerTitle: 'Finance Manager', positions: ['Accountant', 'Payroll Specialist'], staffCount: 7 },
  { name: 'HR', managerTitle: 'HR Manager', positions: ['HR Officer', 'Recruiter'], staffCount: 5 },
  { name: 'Customer Support', managerTitle: 'Support Lead', positions: ['Support Executive'], staffCount: 8 },
  { name: 'Operations', managerTitle: 'Operations Manager', positions: ['Operations Executive'], staffCount: 6 },
  { name: 'Legal', managerTitle: 'Legal Counsel', positions: ['Legal Associate'], staffCount: 3 },
  { name: 'IT', managerTitle: 'IT Manager', positions: ['IT Support Engineer', 'System Administrator'], staffCount: 5 },
];

const COMPANIES = ['PayOrbit', 'PayOrbit Europe'];
const WORK_LOCATIONS = ['Mumbai', 'Bengaluru', 'Pune', 'Delhi NCR', 'Hyderabad', 'Remote', 'London'];

const usedWorkEmails = new Set<string>(['admin@example.com']);
function uniqueWorkEmail(fullName: string): string {
  const base = fullName
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim()
    .replace(/\s+/g, '.');
  let email = `${base}@company.com`;
  let suffix = 1;
  while (usedWorkEmails.has(email)) {
    email = `${base}${suffix}@company.com`;
    suffix += 1;
  }
  usedWorkEmails.add(email);
  return email;
}

function pickEmployeeType(): EmployeeType {
  return faker.helpers.weightedArrayElement([
    { weight: 68, value: EmployeeType.FULL_TIME },
    { weight: 10, value: EmployeeType.PART_TIME },
    { weight: 14, value: EmployeeType.CONTRACT },
    { weight: 8, value: EmployeeType.INTERN },
  ]);
}

function pickEmployeeStatus(): EmployeeStatus {
  return chance() < 0.9 ? EmployeeStatus.ACTIVE : EmployeeStatus.INACTIVE;
}

function wageRangeFor(jobPosition: string, employeeType: EmployeeType): [number, number] {
  if (employeeType === EmployeeType.INTERN) return [15000, 25000];
  if (/manager|lead|head|counsel/i.test(jobPosition)) return [90000, 145000];
  if (/senior/i.test(jobPosition)) return [70000, 95000];
  return [45000, 75000];
}

function isWeekend(d: Date): boolean {
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

/** Samples `count` weekdays spread across a given UTC month. */
function sampleWeekdaysInMonth(year: number, month0: number, count: number): string[] {
  const all: string[] = [];
  const d = new Date(Date.UTC(year, month0, 1));
  while (d.getUTCMonth() === month0) {
    if (!isWeekend(d)) all.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  if (all.length <= count) return all;
  const step = all.length / count;
  return Array.from({ length: count }, (_, i) => all[Math.floor(i * step)]);
}

/** The last `count` weekdays ending today, for populating the live Attendance screen. */
function recentWeekdays(count: number): string[] {
  const dates: string[] = [];
  const d = new Date();
  while (dates.length < count) {
    if (!isWeekend(d)) dates.unshift(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return dates;
}

function pickAttendanceStatus(): AttendanceStatus {
  const roll = chance();
  if (roll < 0.08) return AttendanceStatus.ABSENT;
  if (roll < 0.2) return AttendanceStatus.LATE;
  return AttendanceStatus.PRESENT;
}

function buildAttendance(attendanceRepository: ReturnType<typeof AppDataSource.getRepository<Attendance>>, employeeId: string, date: string) {
  const status = pickAttendanceStatus();
  if (status === AttendanceStatus.ABSENT) {
    return attendanceRepository.create({ employeeId, date, checkIn: null, checkOut: null, status });
  }
  const checkInHour = status === AttendanceStatus.LATE ? faker.number.int({ min: 10, max: 11 }) : 9;
  const checkOutHour = faker.number.int({ min: 17, max: 20 });
  return attendanceRepository.create({
    employeeId,
    date,
    checkIn: new Date(`${date}T${String(checkInHour).padStart(2, '0')}:00:00Z`),
    checkOut: new Date(`${date}T${String(checkOutHour).padStart(2, '0')}:00:00Z`),
    status,
  });
}

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
  const holidayRepository = AppDataSource.getRepository(Holiday);

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
  const partTimeSchedule = await workingScheduleRepository.save(
    workingScheduleRepository.create({
      name: 'Part-Time 20h/Week',
      company: 'PayOrbit',
      timezone: 'UTC',
      weeklyHours: '20.00',
      days: weekdays.map((dayOfWeek) =>
        Object.assign(new WorkingScheduleDay(), { dayOfWeek, startTime: '10:00', endTime: '14:00', breakMinutes: 0 })
      ),
    })
  );
  console.log('Seeded 2 working schedules (Standard 40h/Week, Part-Time 20h/Week).');

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
  const sickType = savedTimeOffTypes.find((t) => t.name === 'Sick Leave')!;
  const unpaidType = savedTimeOffTypes.find((t) => t.name === 'Unpaid Leave')!;
  console.log(`Seeded ${DEMO_TIME_OFF_TYPES.length} time off types.`);

  const standardStructure = await salaryStructureRepository.save(
    salaryStructureRepository.create({ name: 'Standard Structure', active: true })
  );
  const contractorStructure = await salaryStructureRepository.save(
    salaryStructureRepository.create({ name: 'Contractor Structure', active: true })
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
    salaryRuleRepository.create({
      name: 'Basic Salary',
      code: 'BASIC',
      category: SalaryRuleCategory.BASIC,
      sequence: 10,
      salaryStructureId: contractorStructure.id,
      computationMethod: SalaryRuleComputationMethod.FIXED,
      value: '20000.00',
    }),
    salaryRuleRepository.create({
      name: 'Conveyance Allowance',
      code: 'CONV',
      category: SalaryRuleCategory.ALLOWANCE,
      sequence: 20,
      salaryStructureId: contractorStructure.id,
      computationMethod: SalaryRuleComputationMethod.PERCENTAGE,
      value: '15.00',
    }),
    salaryRuleRepository.create({
      name: 'Professional Tax',
      code: 'PTAX',
      category: SalaryRuleCategory.DEDUCTION,
      sequence: 30,
      salaryStructureId: contractorStructure.id,
      computationMethod: SalaryRuleComputationMethod.FIXED,
      value: '200.00',
    }),
  ]);
  console.log('Seeded 2 salary structures (Standard, Contractor) with 6 rules.');

  const DEMO_HOLIDAYS: Array<{ name: string; date: string; recurring: boolean; notes?: string }> = [
    { name: "New Year's Day", date: '2026-01-01', recurring: true },
    { name: 'Republic Day', date: '2026-01-26', recurring: true },
    { name: 'Holi', date: '2026-03-04', recurring: true },
    { name: 'Independence Day', date: '2026-08-15', recurring: true },
    { name: 'Gandhi Jayanti', date: '2026-10-02', recurring: true },
    { name: 'Diwali', date: '2026-11-08', recurring: false, notes: 'Date shifts yearly with the lunar calendar.' },
    { name: 'Eid al-Fitr', date: '2026-03-20', recurring: false, notes: 'Date shifts yearly with the lunar calendar.' },
    { name: 'Christmas Day', date: '2026-12-25', recurring: true },
  ];
  await holidayRepository.save(DEMO_HOLIDAYS.map((h) => holidayRepository.create({ ...h, notes: h.notes ?? null })));
  console.log(`Seeded ${DEMO_HOLIDAYS.length} company holidays.`);

  /** Linked to an Employee too (not just DEMO_ACCOUNTS) so self-service features — check-in/out, filing your own Time Off Request — work from the Admin login as well, not only from the other demo roles. */
  const adminEmployee = await employeeRepository.save(
    employeeRepository.create({
      fullName: 'System Admin',
      workEmail: 'admin@example.com',
      jobPosition: 'Platform Administrator',
      department: 'Administration',
    })
  );
  const admin = await userRepository.save(
    userRepository.create({
      email: 'admin@example.com',
      passwordHash,
      role: UserRole.ADMIN,
      employeeId: adminEmployee.id,
    })
  );

  const employeesByName: Record<string, Employee> = {};
  const usersByName: Record<string, User> = {};
  for (const account of DEMO_ACCOUNTS) {
    const workEmail = `${account.fullName.toLowerCase().replace(/\s+/g, '.')}@company.com`;
    usedWorkEmails.add(workEmail);
    const employee = await employeeRepository.save(
      employeeRepository.create({
        fullName: account.fullName,
        workEmail,
        jobPosition: account.jobPosition,
        department: account.department,
        workingScheduleId: standardSchedule.id,
        bankAccountNumber: faker.finance.accountNumber(12),
      })
    );
    employeesByName[account.fullName] = employee;
    usersByName[account.fullName] = await userRepository.save(
      userRepository.create({
        email: workEmail,
        passwordHash,
        role: account.role,
        employeeId: employee.id,
      })
    );
  }
  console.log(`Seeded ${DEMO_ACCOUNTS.length} employees with linked user accounts (one per role).`);
  const mayaUser = usersByName['Maya Shah'];
  const nishaUser = usersByName['Nisha Rao'];

  // --- Generated department roster (managers + staff) ---
  const allEmployees: Employee[] = [];
  for (const dept of DEPARTMENTS) {
    const managerName = faker.person.fullName();
    const manager = await employeeRepository.save(
      employeeRepository.create({
        fullName: managerName,
        workEmail: uniqueWorkEmail(managerName),
        jobPosition: dept.managerTitle,
        department: dept.name,
        employeeType: EmployeeType.FULL_TIME,
        status: EmployeeStatus.ACTIVE,
        workingScheduleId: standardSchedule.id,
        workLocation: faker.helpers.arrayElement(WORK_LOCATIONS),
        company: faker.helpers.weightedArrayElement([{ weight: 8, value: COMPANIES[0] }, { weight: 2, value: COMPANIES[1] }]),
        phone: faker.phone.number(),
        personalEmail: faker.internet.email().toLowerCase(),
        homeAddress: `${faker.location.streetAddress()}, ${faker.location.city()}`,
        dateOfBirth: faker.date.birthdate({ min: 30, max: 55, mode: 'age' }).toISOString().slice(0, 10),
        emergencyContactName: faker.person.fullName(),
        emergencyContactPhone: faker.phone.number(),
        bankAccountNumber: faker.finance.accountNumber(12),
      })
    );
    allEmployees.push(manager);

    const staffCreates = Array.from({ length: dept.staffCount }, () => {
      const fullName = faker.person.fullName();
      const employeeType = pickEmployeeType();
      const status = pickEmployeeStatus();
      const scheduleId = employeeType === EmployeeType.PART_TIME ? partTimeSchedule.id : standardSchedule.id;
      return employeeRepository.create({
        fullName,
        workEmail: uniqueWorkEmail(fullName),
        jobPosition: faker.helpers.arrayElement(dept.positions),
        department: dept.name,
        employeeType,
        status,
        managerId: manager.id,
        workingScheduleId: scheduleId,
        workLocation: faker.helpers.arrayElement(WORK_LOCATIONS),
        company: faker.helpers.weightedArrayElement([{ weight: 8, value: COMPANIES[0] }, { weight: 2, value: COMPANIES[1] }]),
        phone: faker.phone.number(),
        personalEmail: faker.internet.email().toLowerCase(),
        homeAddress: `${faker.location.streetAddress()}, ${faker.location.city()}`,
        dateOfBirth: faker.date.birthdate({ min: 20, max: 58, mode: 'age' }).toISOString().slice(0, 10),
        emergencyContactName: faker.person.fullName(),
        emergencyContactPhone: faker.phone.number(),
        bankAccountNumber: chance() < 0.85 ? faker.finance.accountNumber(12) : null,
      });
    });
    const savedStaff = await employeeRepository.save(staffCreates);
    allEmployees.push(...savedStaff);
  }
  console.log(`Seeded ${allEmployees.length} additional employees across ${DEPARTMENTS.length} departments.`);

  // --- Contracts ---
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

  const genContracts: Contract[] = [];
  for (const emp of allEmployees) {
    const [min, max] = wageRangeFor(emp.jobPosition ?? '', emp.employeeType);
    const wage = faker.number.int({ min, max });
    const isContractor = emp.employeeType === EmployeeType.CONTRACT;
    const structureId = isContractor ? contractorStructure.id : standardStructure.id;
    const hasEnded = emp.status === EmployeeStatus.INACTIVE || chance() < 0.25;
    const startDate = faker.date.between({ from: '2023-06-01', to: '2025-10-01' }).toISOString().slice(0, 10);

    let endDate: string | null = null;
    if (hasEnded) {
      const endBound = emp.status === EmployeeStatus.INACTIVE ? '2026-08-31' : '2025-12-31';
      endDate = faker.date.between({ from: startDate, to: endBound }).toISOString().slice(0, 10);
    }

    contractSequence += 1;
    genContracts.push(
      contractRepository.create({
        contractNumber: `CON/${new Date(startDate).getFullYear()}/${String(contractSequence).padStart(4, '0')}`,
        employeeId: emp.id,
        department: emp.department,
        jobPosition: emp.jobPosition,
        startDate,
        endDate,
        wagePerMonth: wage.toFixed(2),
        workingScheduleId: emp.workingScheduleId,
        salaryStructureId: structureId,
        notes: endDate ? 'Contract ended.' : 'Running contract — source for payroll in the active period.',
      })
    );

    if (endDate && emp.status === EmployeeStatus.ACTIVE) {
      const nextStart = new Date(endDate);
      nextStart.setUTCDate(nextStart.getUTCDate() + 1);
      const nextStartDate = nextStart.toISOString().slice(0, 10);
      contractSequence += 1;
      genContracts.push(
        contractRepository.create({
          contractNumber: `CON/${nextStart.getUTCFullYear()}/${String(contractSequence).padStart(4, '0')}`,
          employeeId: emp.id,
          department: emp.department,
          jobPosition: emp.jobPosition,
          startDate: nextStartDate,
          endDate: null,
          wagePerMonth: Math.round(wage * 1.08).toFixed(2),
          workingScheduleId: emp.workingScheduleId,
          salaryStructureId: structureId,
          notes: 'Renewed contract — current.',
        })
      );
    }
  }
  await contractRepository.save(genContracts, { chunk: 200 });
  console.log(`Seeded ${DEMO_CONTRACTS.length + genContracts.length} contracts.`);

  // --- Users ---
  const shuffledGenerated = faker.helpers.shuffle([...allEmployees]);
  const linkedForUsers = shuffledGenerated.slice(0, 35);
  const linkedUsers = linkedForUsers.map((emp, idx) =>
    userRepository.create({
      email: emp.workEmail,
      passwordHash,
      role: UserRole.EMPLOYEE,
      status: idx < 4 ? UserStatus.INACTIVE : UserStatus.ACTIVE,
      employeeId: emp.id,
    })
  );
  const usedUserEmails = new Set<string>([admin.email, ...Object.values(usersByName).map((u) => u.email), ...linkedUsers.map((u) => u.email)]);
  const standaloneUsers = Array.from({ length: 20 }, (_, idx) => {
    let email = faker.internet.email().toLowerCase();
    while (usedUserEmails.has(email)) email = faker.internet.email().toLowerCase();
    usedUserEmails.add(email);
    return userRepository.create({
      email,
      passwordHash,
      role: UserRole.EMPLOYEE,
      status: idx < 3 ? UserStatus.INACTIVE : UserStatus.ACTIVE,
    });
  });
  await userRepository.save([...linkedUsers, ...standaloneUsers], { chunk: 200 });
  console.log(
    `Seeded ${1 + DEMO_ACCOUNTS.length + linkedUsers.length + standaloneUsers.length} users (including 1 admin, ${
      DEMO_ACCOUNTS.length
    } demo role accounts).`
  );
  console.log(`All seeded accounts use the password: ${SEED_PASSWORD}`);

  // --- Attendance ---
  const activeGenerated = allEmployees.filter((e) => e.status === EmployeeStatus.ACTIVE);
  const activeNonAdmin = [...Object.values(employeesByName), ...activeGenerated];
  const historicalMonths: Array<[number, number]> = [
    [2025, 9], // October 2025
    [2025, 10], // November 2025
    [2025, 11], // December 2025
    [2026, 0], // January 2026
    [2026, 3], // April 2026
    [2026, 6], // July 2026
  ];
  const attendanceRows: Attendance[] = [];
  for (const emp of activeNonAdmin) {
    for (const [year, month0] of historicalMonths) {
      for (const date of sampleWeekdaysInMonth(year, month0, 4)) {
        attendanceRows.push(buildAttendance(attendanceRepository, emp.id, date));
      }
    }
    for (const date of recentWeekdays(20)) {
      attendanceRows.push(buildAttendance(attendanceRepository, emp.id, date));
    }
  }
  await attendanceRepository.save(attendanceRows, { chunk: 500 });
  console.log(`Seeded ${attendanceRows.length} attendance records.`);

  // --- Time Off Allocations ---
  const allocationCreates: TimeOffAllocation[] = [];
  for (const emp of activeNonAdmin) {
    if (chance() < 0.65) {
      const roll = chance();
      const status =
        roll < 0.85 ? TimeOffAllocationStatus.APPROVED : roll < 0.95 ? TimeOffAllocationStatus.PENDING : TimeOffAllocationStatus.REFUSED;
      allocationCreates.push(
        timeOffAllocationRepository.create({
          employeeId: emp.id,
          timeOffTypeId: ptoType.id,
          allocated: faker.number.int({ min: 8, max: 24 }).toFixed(2),
          status,
          approverId: status !== TimeOffAllocationStatus.PENDING ? mayaUser.id : null,
          validFrom: '2026-01-01',
          validTo: '2026-12-31',
        })
      );
    }
  }
  const savedAllocations = await timeOffAllocationRepository.save(allocationCreates, { chunk: 200 });
  console.log(`Seeded ${savedAllocations.length} time off allocations.`);

  const approvedAllocationByEmployee = new Map<string, string>();
  for (const a of savedAllocations) {
    if (a.status === TimeOffAllocationStatus.APPROVED) approvedAllocationByEmployee.set(a.employeeId, a.id);
  }

  // --- Time Off Requests ---
  const reasons = ['Family trip', 'Medical appointment', 'Personal matters', 'Vacation', 'Wedding', 'Relocation', 'Rest and recovery'];
  const requestCreates: TimeOffRequest[] = [];
  for (const emp of activeNonAdmin) {
    if (chance() >= 0.55) continue;
    const numRequests = faker.number.int({ min: 1, max: 3 });
    for (let i = 0; i < numRequests; i++) {
      const typeRoll = chance();
      let type = typeRoll < 0.5 ? ptoType : typeRoll < 0.8 ? sickType : unpaidType;
      let allocationId: string | null = null;
      if (type.id === ptoType.id) {
        const allocId = approvedAllocationByEmployee.get(emp.id);
        if (!allocId) {
          type = sickType;
        } else {
          allocationId = allocId;
        }
      }

      const statusRoll = chance();
      const status =
        statusRoll < 0.5 ? TimeOffRequestStatus.APPROVED : statusRoll < 0.7 ? TimeOffRequestStatus.REFUSED : TimeOffRequestStatus.PENDING;
      const start = status === TimeOffRequestStatus.PENDING ? faker.date.soon({ days: 60 }) : faker.date.recent({ days: 180 });
      const durationDays = faker.number.int({ min: 1, max: 4 });
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + durationDays - 1);
      const approverId =
        status === TimeOffRequestStatus.PENDING ? null : type.id === unpaidType.id ? nishaUser.id : mayaUser.id;

      requestCreates.push(
        timeOffRequestRepository.create({
          employeeId: emp.id,
          timeOffTypeId: type.id,
          allocationId,
          startDate: start.toISOString().slice(0, 10),
          endDate: end.toISOString().slice(0, 10),
          duration: durationDays.toFixed(2),
          status,
          approverId,
          reason: faker.helpers.arrayElement(reasons),
        })
      );
    }
  }
  await timeOffRequestRepository.save(requestCreates, { chunk: 200 });
  console.log(`Seeded ${requestCreates.length} time off requests.`);

  // --- Pay Runs ---
  const activeEmployeeIds = activeNonAdmin.map((e) => e.id);
  const growingSubset = (count: number) => activeEmployeeIds.slice(0, Math.min(count, activeEmployeeIds.length));
  const contractorIds = allEmployees
    .filter((e) => e.employeeType === EmployeeType.CONTRACT && e.status === EmployeeStatus.ACTIVE)
    .map((e) => e.id);

  const octoberPayRun = await payRunService.createPayRun({
    name: 'October 2025',
    salaryStructureId: standardStructure.id,
    periodStart: '2025-10-01',
    periodEnd: '2025-10-31',
    employeeIds: growingSubset(40),
  });
  await payRunService.computePayRun(octoberPayRun.id);
  await payRunService.validatePayRun(octoberPayRun.id);
  await payRunService.markPayRunPaid(octoberPayRun.id);

  const novemberPayRun = await payRunService.createPayRun({
    name: 'November 2025',
    salaryStructureId: standardStructure.id,
    periodStart: '2025-11-01',
    periodEnd: '2025-11-30',
    employeeIds: growingSubset(55),
  });
  await payRunService.computePayRun(novemberPayRun.id);
  await payRunService.validatePayRun(novemberPayRun.id);
  await payRunService.markPayRunPaid(novemberPayRun.id);

  const decemberPayRun = await payRunService.createPayRun({
    name: 'December 2025',
    salaryStructureId: standardStructure.id,
    periodStart: '2025-12-01',
    periodEnd: '2025-12-31',
    employeeIds: growingSubset(70),
  });
  await payRunService.computePayRun(decemberPayRun.id);
  await payRunService.validatePayRun(decemberPayRun.id);
  await payRunService.markPayRunPaid(decemberPayRun.id);

  const januaryPayRun = await payRunService.createPayRun({
    name: 'January 2026',
    salaryStructureId: standardStructure.id,
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    employeeIds: activeEmployeeIds,
  });
  await payRunService.computePayRun(januaryPayRun.id);
  await payRunService.validatePayRun(januaryPayRun.id);
  await payRunService.markPayRunPaid(januaryPayRun.id);

  if (contractorIds.length > 0) {
    const contractorsPayRun = await payRunService.createPayRun({
      name: 'Q1 2026 Contractors',
      salaryStructureId: contractorStructure.id,
      periodStart: '2026-01-01',
      periodEnd: '2026-03-31',
      employeeIds: contractorIds,
    });
    await payRunService.computePayRun(contractorsPayRun.id);
    await payRunService.validatePayRun(contractorsPayRun.id);
    await payRunService.markPayRunPaid(contractorsPayRun.id);
  }

  const aprilPayRun = await payRunService.createPayRun({
    name: 'April 2026',
    salaryStructureId: standardStructure.id,
    periodStart: '2026-04-01',
    periodEnd: '2026-04-30',
    employeeIds: activeEmployeeIds,
  });
  await payRunService.computePayRun(aprilPayRun.id);
  await payRunService.validatePayRun(aprilPayRun.id);

  const julyPayRun = await payRunService.createPayRun({
    name: 'July 2026',
    salaryStructureId: standardStructure.id,
    periodStart: '2026-07-01',
    periodEnd: '2026-07-31',
    employeeIds: activeEmployeeIds,
  });
  await payRunService.computePayRun(julyPayRun.id);

  await payRunService.createPayRun({
    name: 'August 2026',
    salaryStructureId: standardStructure.id,
    periodStart: '2026-08-01',
    periodEnd: '2026-08-31',
    employeeIds: growingSubset(20),
  });

  console.log(
    `Seeded 8 pay runs (4 paid, 1 validated, 2 draft — one computed, one not) covering ${activeEmployeeIds.length} active employees.`
  );

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
