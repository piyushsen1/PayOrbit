import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Employee } from './Employee';
import { TimeOffType } from './TimeOffType';
import { TimeOffAllocation } from './TimeOffAllocation';
import { User } from './User';

export enum TimeOffRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REFUSED = 'refused',
}

/**
 * One leave request. `allocationId` is only set when the type requires
 * allocation (see docs/DATABASE.md known relations) — resolved server-side at
 * creation to whichever approved Allocation has enough remaining balance.
 * Approving deducts from that allocation's derived `taken` automatically
 * (nothing to reconcile — see TimeOffAllocation).
 */
@Entity('time_off_requests')
export class TimeOffRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'employee_id' })
  employeeId!: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;

  @Column({ type: 'uuid', name: 'time_off_type_id' })
  timeOffTypeId!: string;

  @ManyToOne(() => TimeOffType, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'time_off_type_id' })
  timeOffType!: TimeOffType;

  @Column({ type: 'uuid', name: 'allocation_id', nullable: true })
  allocationId!: string | null;

  @ManyToOne(() => TimeOffAllocation, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'allocation_id' })
  allocation!: TimeOffAllocation | null;

  @Column({ type: 'date', name: 'start_date' })
  startDate!: string;

  @Column({ type: 'date', name: 'end_date' })
  endDate!: string;

  /** In the time off type's unit (days or hours) — not auto-computed from the date range in this MVP. */
  @Column({ type: 'numeric', precision: 8, scale: 2 })
  duration!: string;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ type: 'enum', enum: TimeOffRequestStatus, default: TimeOffRequestStatus.PENDING })
  status!: TimeOffRequestStatus;

  @Column({ type: 'uuid', name: 'approver_id', nullable: true })
  approverId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approver_id' })
  approver!: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
