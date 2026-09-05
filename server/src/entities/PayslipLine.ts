import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Payslip } from './Payslip';
import { SalaryRule, SalaryRuleCategory } from './SalaryRule';

/**
 * One evaluated Salary Rule on one Payslip, snapshotted at compute time
 * (name/code/category copied, not joined) so the payslip stays readable and
 * numerically unchanged even if the underlying SalaryRule is edited or
 * deleted afterward — recomputing (while still draft) replaces the full set.
 */
@Entity('payslip_lines')
export class PayslipLine {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'payslip_id' })
  payslipId!: string;

  @ManyToOne(() => Payslip, (payslip) => payslip.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payslip_id' })
  payslip!: Payslip;

  @Column({ type: 'uuid', name: 'salary_rule_id', nullable: true })
  salaryRuleId!: string | null;

  @ManyToOne(() => SalaryRule, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'salary_rule_id' })
  salaryRule!: SalaryRule | null;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  code!: string;

  @Column({ type: 'enum', enum: SalaryRuleCategory })
  category!: SalaryRuleCategory;

  @Column({ type: 'int' })
  sequence!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount!: string;
}
