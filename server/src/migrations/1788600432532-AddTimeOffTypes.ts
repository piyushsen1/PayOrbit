import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTimeOffTypes1788600432532 implements MigrationInterface {
    name = 'AddTimeOffTypes1788600432532'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."time_off_types_unit_enum" AS ENUM('days', 'hours')`);
        await queryRunner.query(`CREATE TYPE "public"."time_off_types_approval_role_enum" AS ENUM('employee', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin')`);
        await queryRunner.query(`CREATE TYPE "public"."time_off_types_status_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "time_off_types" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "unit" "public"."time_off_types_unit_enum" NOT NULL DEFAULT 'days', "allocation_required" boolean NOT NULL DEFAULT true, "approval_role" "public"."time_off_types_approval_role_enum" NOT NULL DEFAULT 'hr_manager', "affects_payroll" boolean NOT NULL DEFAULT true, "color" character varying, "status" "public"."time_off_types_status_enum" NOT NULL DEFAULT 'active', "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5c684010114e9b49b81970f0bf9" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "time_off_types"`);
        await queryRunner.query(`DROP TYPE "public"."time_off_types_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."time_off_types_approval_role_enum"`);
        await queryRunner.query(`DROP TYPE "public"."time_off_types_unit_enum"`);
    }

}
