import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * One company holiday for a given calendar date. HR Manager and above manage
 * this list (added per year); every role can read it — it's the one
 * everyone-sees module, unlike most of the rest of this app.
 */
@Entity("holidays")
export class Holiday {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar" })
  name!: string;

  @Column({ type: "date" })
  date!: string;

  /** Repeats on the same month/day every year (e.g. a national holiday) rather than a one-off date. */
  @Column({ type: "boolean", default: false })
  recurring!: boolean;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
