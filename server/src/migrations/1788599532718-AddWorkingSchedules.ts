import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWorkingSchedules1788599532718 implements MigrationInterface {
    name = 'AddWorkingSchedules1788599532718'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."working_schedules_status_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "working_schedules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "company" character varying NOT NULL, "timezone" character varying NOT NULL DEFAULT 'UTC', "status" "public"."working_schedules_status_enum" NOT NULL DEFAULT 'active', "weekly_hours" numeric(5,2) NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ed597bdd2dbe3c96334a76042c6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."working_schedule_days_day_of_week_enum" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')`);
        await queryRunner.query(`CREATE TABLE "working_schedule_days" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "working_schedule_id" uuid NOT NULL, "day_of_week" "public"."working_schedule_days_day_of_week_enum" NOT NULL, "start_time" TIME NOT NULL, "end_time" TIME NOT NULL, "break_minutes" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_d46a396aca042495f882e59b671" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "working_schedule_days" ADD CONSTRAINT "FK_dc80393769eccf79c9aa43ea770" FOREIGN KEY ("working_schedule_id") REFERENCES "working_schedules"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "working_schedule_days" DROP CONSTRAINT "FK_dc80393769eccf79c9aa43ea770"`);
        await queryRunner.query(`DROP TABLE "working_schedule_days"`);
        await queryRunner.query(`DROP TYPE "public"."working_schedule_days_day_of_week_enum"`);
        await queryRunner.query(`DROP TABLE "working_schedules"`);
        await queryRunner.query(`DROP TYPE "public"."working_schedules_status_enum"`);
    }

}
