import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { SalaryStructure } from './SalaryStructure';
import { Payslip } from './Payslip';

export enum PayRunStatus {
  DRAFT = 'draft',
  VALIDATED = 'validated',
  PAID = 'paid',
}

/**
 * One payroll period. Created with its full employee selection in one step
 * (wizard step 1+2 combined — see Payrun Form) — Payslip rows are generated
 * at creation, not added later. `status` only moves via the explicit
 * Validate/Mark Paid actions; `POST /:id/compute` can be re-run any number of
 * times while still `draft`, but never after — that's what "Validate" locks.
 */
@Entity('pay_runs')
export class PayRun {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'uuid', name: 'salary_structure_id' })
  salaryStructureId!: string;

  @ManyToOne(() => SalaryStructure)
  @JoinColumn({ name: 'salary_structure_id' })
  salaryStructure!: SalaryStructure;

  @Column({ type: 'date', name: 'period_start' })
  periodStart!: string;

  @Column({ type: 'date', name: 'period_end' })
  periodEnd!: string;

  @Column({ type: 'enum', enum: PayRunStatus, default: PayRunStatus.DRAFT })
  status!: PayRunStatus;

  @OneToMany(() => Payslip, (payslip) => payslip.payRun)
  payslips!: Payslip[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
