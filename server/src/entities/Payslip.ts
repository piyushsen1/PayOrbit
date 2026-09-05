import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { PayRun } from './PayRun';
import { Employee } from './Employee';
import { Contract } from './Contract';
import { PayslipLine } from './PayslipLine';

export enum PayslipStatus {
  DRAFT = 'draft',
  VALIDATED = 'validated',
  PAID = 'paid',
}

/** Discrete codes for each warning `computeOnePayslip` can raise — lets the client filter/style by category instead of parsing `warning` text. */
export enum PayslipWarningType {
  MISSING_BANK_DETAILS = 'missing_bank_details',
  NO_ACTIVE_CONTRACT = 'no_active_contract',
  CONTRACT_DELETED = 'contract_deleted',
  NO_ATTENDANCE = 'no_attendance',
  FORMULA_ERROR = 'formula_error',
}

/**
 * One employee's computed salary for one PayRun. `contractId` is resolved
 * once at PayRun creation (the *applicable* contract overlapping the period,
 * not necessarily the employee's current one — see docs/DATABASE.md) and
 * never changes afterward, even if the employee's contracts change later.
 * `basic`/`grossTotal`/`netTotal`/`workedDays`/`warning` are null until
 * `POST /pay-runs/:id/compute` runs, then frozen as a snapshot — unlike
 * Contract/Attendance's derive-always fields, payroll numbers must not shift
 * under a validated/paid payslip.
 */
@Entity('payslips')
export class Payslip {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'pay_run_id' })
  payRunId!: string;

  @ManyToOne(() => PayRun, (payRun) => payRun.payslips, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pay_run_id' })
  payRun!: PayRun;

  @Column({ type: 'uuid', name: 'employee_id' })
  employeeId!: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;

  @Column({ type: 'uuid', name: 'contract_id', nullable: true })
  contractId!: string | null;

  @ManyToOne(() => Contract, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contract_id' })
  contract!: Contract | null;

  @Column({ type: 'numeric', precision: 6, scale: 2, name: 'worked_days', nullable: true })
  workedDays!: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  basic!: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'gross_total', nullable: true })
  grossTotal!: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'net_total', nullable: true })
  netTotal!: string | null;

  @Column({ type: 'text', nullable: true })
  warning!: string | null;

  /** Machine-readable codes for the warnings folded into `warning`'s text, e.g. `['missing_bank_details','no_attendance']`. */
  @Column({ type: 'simple-array', name: 'warning_types', nullable: true })
  warningTypes!: PayslipWarningType[] | null;

  @Column({ type: 'enum', enum: PayslipStatus, default: PayslipStatus.DRAFT })
  status!: PayslipStatus;

  @OneToMany(() => PayslipLine, (line) => line.payslip)
  lines!: PayslipLine[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
