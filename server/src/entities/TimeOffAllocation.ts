import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Employee } from './Employee';
import { TimeOffType } from './TimeOffType';
import { User } from './User';

export enum TimeOffAllocationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REFUSED = 'refused',
}

/**
 * A leave balance grant. Approval is what makes the balance available to
 * Requests (see root CLAUDE.md Time Off Allocations row) — `taken`/`remaining`
 * are derived from approved Requests linked to this allocation at read time,
 * never stored, so they can't drift when a request is approved/refused/deleted
 * later (same "derive, don't cache" choice as Contract status).
 */
@Entity('time_off_allocations')
export class TimeOffAllocation {
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

  @Column({ type: 'numeric', precision: 8, scale: 2 })
  allocated!: string;

  @Column({ type: 'enum', enum: TimeOffAllocationStatus, default: TimeOffAllocationStatus.PENDING })
  status!: TimeOffAllocationStatus;

  @Column({ type: 'uuid', name: 'approver_id', nullable: true })
  approverId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approver_id' })
  approver!: User | null;

  @Column({ type: 'date', name: 'valid_from', nullable: true })
  validFrom!: string | null;

  @Column({ type: 'date', name: 'valid_to', nullable: true })
  validTo!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
