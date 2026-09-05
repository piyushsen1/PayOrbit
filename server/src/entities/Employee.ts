import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { WorkingSchedule } from './WorkingSchedule';

export enum EmployeeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

/** Employment category — a Dashboard filter dimension (Period/Department/Employee Type/Company). */
export enum EmployeeType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  INTERN = 'intern',
}

/**
 * Central HR record — Employee Form hub (Work Information / Private Information
 * tabs). `department`/`company`/`workLocation` are plain strings, not relations
 * (see docs/ARCHITECTURE.md open question on Department).
 */
@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', name: 'full_name' })
  fullName!: string;

  @Column({ type: 'varchar', name: 'work_email', unique: true })
  workEmail!: string;

  @Column({ type: 'varchar', name: 'job_position', nullable: true })
  jobPosition!: string | null;

  @Column({ type: 'varchar', nullable: true })
  department!: string | null;

  @Column({ type: 'enum', enum: EmployeeStatus, default: EmployeeStatus.ACTIVE })
  status!: EmployeeStatus;

  @Column({ type: 'enum', enum: EmployeeType, name: 'employee_type', default: EmployeeType.FULL_TIME })
  employeeType!: EmployeeType;

  @Column({ type: 'uuid', name: 'manager_id', nullable: true })
  managerId!: string | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'manager_id' })
  manager!: Employee | null;

  @Column({ type: 'uuid', name: 'working_schedule_id', nullable: true })
  workingScheduleId!: string | null;

  @ManyToOne(() => WorkingSchedule, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'working_schedule_id' })
  workingSchedule!: WorkingSchedule | null;

  @Column({ type: 'varchar', name: 'work_location', nullable: true })
  workLocation!: string | null;

  @Column({ type: 'varchar', nullable: true })
  company!: string | null;

  // -- Private Information tab --
  @Column({ type: 'varchar', nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', name: 'personal_email', nullable: true })
  personalEmail!: string | null;

  @Column({ type: 'varchar', name: 'home_address', nullable: true })
  homeAddress!: string | null;

  @Column({ type: 'date', name: 'date_of_birth', nullable: true })
  dateOfBirth!: string | null;

  @Column({ type: 'varchar', name: 'emergency_contact_name', nullable: true })
  emergencyContactName!: string | null;

  @Column({ type: 'varchar', name: 'emergency_contact_phone', nullable: true })
  emergencyContactPhone!: string | null;

  /** Missing this triggers the "missing bank details" pay-run warning (see pay-run.service.ts). */
  @Column({ type: 'varchar', name: 'bank_account_number', nullable: true })
  bankAccountNumber!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
