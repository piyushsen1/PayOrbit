import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAttendance1788619097416 implements MigrationInterface {
    name = 'AddAttendance1788619097416'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."attendances_status_enum" AS ENUM('present', 'absent')`);
        await queryRunner.query(`CREATE TABLE "attendances" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "employee_id" uuid NOT NULL, "date" date NOT NULL, "check_in" TIMESTAMP WITH TIME ZONE, "check_out" TIMESTAMP WITH TIME ZONE, "status" "public"."attendances_status_enum" NOT NULL DEFAULT 'present', "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_7797173c5d5349271c80c7122c9" UNIQUE ("employee_id", "date"), CONSTRAINT "PK_483ed97cd4cd43ab4a117516b69" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "attendances" ADD CONSTRAINT "FK_43dca8b4751d7449a38b583991c" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "attendances" DROP CONSTRAINT "FK_43dca8b4751d7449a38b583991c"`);
        await queryRunner.query(`DROP TABLE "attendances"`);
        await queryRunner.query(`DROP TYPE "public"."attendances_status_enum"`);
    }

}
