import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { WorkingScheduleDay } from './WorkingScheduleDay';

export enum WorkingScheduleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('working_schedules')
export class WorkingSchedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  company!: string;

  @Column({ type: 'varchar', default: 'UTC' })
  timezone!: string;

  @Column({ type: 'enum', enum: WorkingScheduleStatus, default: WorkingScheduleStatus.ACTIVE })
  status!: WorkingScheduleStatus;

  /** Derived from `days` (sum of per-day end-start-break); recomputed on every write, not user-editable. */
  @Column({ type: 'numeric', name: 'weekly_hours', precision: 5, scale: 2, default: 0 })
  weeklyHours!: string;

  @OneToMany(() => WorkingScheduleDay, (day) => day.workingSchedule, { cascade: ['insert'] })
  days!: WorkingScheduleDay[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
