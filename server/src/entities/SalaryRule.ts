import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { SalaryStructure } from './SalaryStructure';

/** Which section of the Payslip breakdown (Basic/Allowances/Deductions/Gross/Net) this rule's amount rolls into. */
export enum SalaryRuleCategory {
  BASIC = 'basic',
  ALLOWANCE = 'allowance',
  DEDUCTION = 'deduction',
  GROSS = 'gross',
  NET = 'net',
}

export enum SalaryRuleComputationMethod {
  FIXED = 'fixed',
  PERCENTAGE = 'percentage',
  FORMULA = 'formula',
}

/**
 * One computation rule within a Salary Structure. `sequence` determines
 * evaluation order (later rules can reference earlier categories' totals once
 * Payslip computation is built) — never hand-edit `sequence` collisions away,
 * just re-order.
 */
@Entity('salary_rules')
export class SalaryRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  code!: string;

  @Column({ type: 'enum', enum: SalaryRuleCategory })
  category!: SalaryRuleCategory;

  @Column({ type: 'int' })
  sequence!: number;

  @Column({ type: 'uuid', name: 'salary_structure_id' })
  salaryStructureId!: string;

  @ManyToOne(() => SalaryStructure, (structure) => structure.rules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'salary_structure_id' })
  salaryStructure!: SalaryStructure;

  @Column({ type: 'enum', enum: SalaryRuleComputationMethod, name: 'computation_method' })
  computationMethod!: SalaryRuleComputationMethod;

  /** Fixed amount for `fixed`, or the percentage-of-wage number for `percentage`; unused for `formula`. */
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  value!: string | null;

  /** Free-text computation code for `formula`; not executed anywhere yet — Payrun/Payslip computation is later work. */
  @Column({ type: 'text', nullable: true })
  formula!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
