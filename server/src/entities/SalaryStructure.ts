import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { SalaryRule } from './SalaryRule';

/** Ordered set of Salary Rules; assigned on a Contract and selected as a Payrun's scope. */
@Entity('salary_structures')
export class SalaryStructure {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @OneToMany(() => SalaryRule, (rule) => rule.salaryStructure)
  rules!: SalaryRule[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
