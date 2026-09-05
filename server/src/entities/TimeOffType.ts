import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserRole } from './User';

export enum TimeOffUnit {
  DAYS = 'days',
  HOURS = 'hours',
}

export enum TimeOffTypeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

/**
 * Leave policy catalog entry — defines how a Time Off Request/Allocation of this
 * type behaves (unit, whether a balance must be allocated first, who approves,
 * whether it counts toward payroll). No dependencies; consumed by Allocation/Request.
 */
@Entity('time_off_types')
export class TimeOffType {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'enum', enum: TimeOffUnit, default: TimeOffUnit.DAYS })
  unit!: TimeOffUnit;

  @Column({ type: 'boolean', name: 'allocation_required', default: true })
  allocationRequired!: boolean;

  @Column({ type: 'enum', enum: UserRole, name: 'approval_role', default: UserRole.HR_MANAGER })
  approvalRole!: UserRole;

  /** Whether taken time of this type feeds into payroll/work-entry computation. */
  @Column({ type: 'boolean', name: 'affects_payroll', default: true })
  affectsPayroll!: boolean;

  @Column({ type: 'varchar', nullable: true })
  color!: string | null;

  @Column({ type: 'enum', enum: TimeOffTypeStatus, default: TimeOffTypeStatus.ACTIVE })
  status!: TimeOffTypeStatus;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
