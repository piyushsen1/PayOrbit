import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { WorkingSchedule } from './WorkingSchedule';

export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

/** One working day within a WorkingSchedule's weekly pattern (Start/End/Break, per the Working Schedule Form). */
@Entity('working_schedule_days')
export class WorkingScheduleDay {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'working_schedule_id' })
  workingScheduleId!: string;

  @ManyToOne(() => WorkingSchedule, (schedule) => schedule.days, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'working_schedule_id' })
  workingSchedule!: WorkingSchedule;

  @Column({ type: 'enum', enum: DayOfWeek, name: 'day_of_week' })
  dayOfWeek!: DayOfWeek;

  @Column({ type: 'time', name: 'start_time' })
  startTime!: string;

  @Column({ type: 'time', name: 'end_time' })
  endTime!: string;

  @Column({ type: 'int', name: 'break_minutes', default: 0 })
  breakMinutes!: number;
}
