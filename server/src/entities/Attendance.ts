import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Employee } from './Employee';

export enum AttendanceStatus {
  PRESENT = 'present',
  LATE = 'late',
  ABSENT = 'absent',
}

/**
 * One employee's attendance for one calendar day — either from the
 * self-service check-in/out widget, or a manual HR correction/entry.
 * Worked hours/overtime are derived from `checkIn`/`checkOut` plus the
 * employee's Working Schedule, not stored (see attendance.service.ts) — same
 * "derive, don't cache" choice as Contract's Running/Expired status.
 */
@Entity('attendances')
@Unique(['employeeId', 'date'])
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'employee_id' })
  employeeId!: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'timestamptz', name: 'check_in', nullable: true })
  checkIn!: Date | null;

  @Column({ type: 'timestamptz', name: 'check_out', nullable: true })
  checkOut!: Date | null;

  @Column({ type: 'enum', enum: AttendanceStatus, default: AttendanceStatus.PRESENT })
  status!: AttendanceStatus;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
