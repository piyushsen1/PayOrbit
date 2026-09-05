import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Employee } from './Employee';
import { WorkingSchedule } from './WorkingSchedule';
import { SalaryStructure } from './SalaryStructure';

/**
 * One employment term for an Employee. `department`/`jobPosition` are a
 * snapshot copied from the Employee at creation (mirrors the Contract Form's
 * read-only auto-fill), not a live join — a later promotion shouldn't rewrite
 * historical contracts. Status (Running/Expired) is derived from `endDate`,
 * not stored — see `computeContractStatus` in the service.
 */
@Entity('contracts')
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', name: 'contract_number', unique: true })
  contractNumber!: string;

  @Column({ type: 'uuid', name: 'employee_id' })
  employeeId!: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;

  @Column({ type: 'varchar', nullable: true })
  department!: string | null;

  @Column({ type: 'varchar', name: 'job_position', nullable: true })
  jobPosition!: string | null;

  @Column({ type: 'date', name: 'start_date' })
  startDate!: string;

  @Column({ type: 'date', name: 'end_date', nullable: true })
  endDate!: string | null;

  @Column({ type: 'numeric', name: 'wage_per_month', precision: 12, scale: 2 })
  wagePerMonth!: string;

  @Column({ type: 'uuid', name: 'working_schedule_id', nullable: true })
  workingScheduleId!: string | null;

  @ManyToOne(() => WorkingSchedule, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'working_schedule_id' })
  workingSchedule!: WorkingSchedule | null;

  @Column({ type: 'uuid', name: 'salary_structure_id', nullable: true })
  salaryStructureId!: string | null;

  @ManyToOne(() => SalaryStructure, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'salary_structure_id' })
  salaryStructure!: SalaryStructure | null;

  @Column({ type: 'text', default: '' })
  notes!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
