import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmployeeTypeAttendanceLatePayslipWarningTypes1788625488415 implements MigrationInterface {
    name = 'AddEmployeeTypeAttendanceLatePayslipWarningTypes1788625488415'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."employees_employee_type_enum" AS ENUM('full_time', 'part_time', 'contract', 'intern')`);
        await queryRunner.query(`ALTER TABLE "employees" ADD "employee_type" "public"."employees_employee_type_enum" NOT NULL DEFAULT 'full_time'`);
        await queryRunner.query(`ALTER TABLE "payslips" ADD "warning_types" text`);
        await queryRunner.query(`ALTER TYPE "public"."attendances_status_enum" RENAME TO "attendances_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."attendances_status_enum" AS ENUM('present', 'late', 'absent')`);
        await queryRunner.query(`ALTER TABLE "attendances" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "attendances" ALTER COLUMN "status" TYPE "public"."attendances_status_enum" USING "status"::"text"::"public"."attendances_status_enum"`);
        await queryRunner.query(`ALTER TABLE "attendances" ALTER COLUMN "status" SET DEFAULT 'present'`);
        await queryRunner.query(`DROP TYPE "public"."attendances_status_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."attendances_status_enum_old" AS ENUM('present', 'absent')`);
        await queryRunner.query(`ALTER TABLE "attendances" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "attendances" ALTER COLUMN "status" TYPE "public"."attendances_status_enum_old" USING "status"::"text"::"public"."attendances_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "attendances" ALTER COLUMN "status" SET DEFAULT 'present'`);
        await queryRunner.query(`DROP TYPE "public"."attendances_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."attendances_status_enum_old" RENAME TO "attendances_status_enum"`);
        await queryRunner.query(`ALTER TABLE "payslips" DROP COLUMN "warning_types"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "employee_type"`);
        await queryRunner.query(`DROP TYPE "public"."employees_employee_type_enum"`);
    }

}
