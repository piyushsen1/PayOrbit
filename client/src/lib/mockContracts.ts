/**
 * Contracts have no backend yet (no entity/migration/route — see root
 * CLAUDE.md TRACKING.md). This is a fully client-local store, seeded with
 * demo data and persisted to localStorage, so the Contracts List/Form
 * screens are real to use today. Once the server grows a Contract module,
 * swap these functions for `api` calls — the shapes mirror what a real
 * list/get/create/update would return.
 */
export type ContractStatus = 'running' | 'expired';

export interface Contract {
  id: string;
  contractNumber: string;
  employeeName: string;
  department: string | null;
  jobPosition: string | null;
  startDate: string; // ISO date, yyyy-mm-dd
  endDate: string | null; // null = open-ended / currently running
  wagePerMonth: number;
  workingScheduleName: string | null;
  structureType: string;
  notes: string;
}

const STORAGE_KEY = 'payorbit_mock_contracts_v1';

const SEED_CONTRACTS: Contract[] = [
  {
    id: 'seed-1',
    contractNumber: 'CON/2026/0001',
    employeeName: 'Aarav Mehta',
    department: 'Finance',
    jobPosition: 'Payroll Specialist',
    startDate: '2026-01-01',
    endDate: null,
    wagePerMonth: 85000,
    workingScheduleName: 'Standard 40h/Week',
    structureType: 'Employee Salary',
    notes: 'This running contract is the source for payroll calculation in the active period.',
  },
  {
    id: 'seed-2',
    contractNumber: 'CON/2025/0004',
    employeeName: 'Aarav Mehta',
    department: 'Finance',
    jobPosition: 'Payroll Specialist',
    startDate: '2025-07-01',
    endDate: '2025-12-31',
    wagePerMonth: 78000,
    workingScheduleName: 'Standard 40h/Week',
    structureType: 'Employee Salary',
    notes: 'Superseded by CON/2026/0001.',
  },
  {
    id: 'seed-3',
    contractNumber: 'CON/2026/0002',
    employeeName: 'Maya Shah',
    department: 'HR',
    jobPosition: 'HR Officer',
    startDate: '2026-01-01',
    endDate: null,
    wagePerMonth: 95000,
    workingScheduleName: 'Standard 40h/Week',
    structureType: 'Employee Salary',
    notes: 'This running contract is the source for payroll calculation in the active period.',
  },
  {
    id: 'seed-4',
    contractNumber: 'CON/2026/0003',
    employeeName: 'Nisha Rao',
    department: 'Finance',
    jobPosition: 'Payroll Manager',
    startDate: '2026-01-01',
    endDate: null,
    wagePerMonth: 110000,
    workingScheduleName: 'Standard 40h/Week',
    structureType: 'Employee Salary',
    notes: 'This running contract is the source for payroll calculation in the active period.',
  },
  {
    id: 'seed-5',
    contractNumber: 'CON/2026/0005',
    employeeName: 'Rohan Patel',
    department: 'Engineering',
    jobPosition: 'Developer',
    startDate: '2026-02-01',
    endDate: null,
    wagePerMonth: 65000,
    workingScheduleName: 'Standard 40h/Week',
    structureType: 'Employee Salary',
    notes: 'This running contract is the source for payroll calculation in the active period.',
  },
];

function readAll(): Contract[] {
  if (typeof window === 'undefined') return SEED_CONTRACTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_CONTRACTS));
      return SEED_CONTRACTS;
    }
    return JSON.parse(raw) as Contract[];
  } catch {
    return SEED_CONTRACTS;
  }
}

function writeAll(contracts: Contract[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts));
}

function isPastDate(isoDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(isoDate) < today;
}

export function getContractStatus(contract: Pick<Contract, 'endDate'>): ContractStatus {
  if (!contract.endDate) return 'running';
  return isPastDate(contract.endDate) ? 'expired' : 'running';
}

function nextContractNumber(existing: Contract[]): string {
  const year = new Date().getFullYear();
  const countThisYear = existing.filter((c) => c.contractNumber.includes(`/${year}/`)).length;
  return `CON/${year}/${String(countThisYear + 1).padStart(4, '0')}`;
}

export function listMockContracts(): Contract[] {
  return readAll();
}

export function getMockContract(id: string): Contract | undefined {
  return readAll().find((c) => c.id === id);
}

export function countRunningContractsForEmployee(employeeName: string, excludeId?: string): number {
  return readAll().filter(
    (c) => c.employeeName === employeeName && c.id !== excludeId && getContractStatus(c) === 'running'
  ).length;
}

export function countContractsForEmployee(employeeName: string): number {
  return readAll().filter((c) => c.employeeName === employeeName).length;
}

export type ContractInput = Omit<Contract, 'id' | 'contractNumber'>;

export function saveMockContract(input: ContractInput, id?: string): Contract {
  const all = readAll();
  if (id) {
    const index = all.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Contract not found.');
    const updated: Contract = { ...all[index], ...input };
    all[index] = updated;
    writeAll(all);
    return updated;
  }
  const created: Contract = {
    ...input,
    id: crypto.randomUUID(),
    contractNumber: nextContractNumber(all),
  };
  writeAll([...all, created]);
  return created;
}
