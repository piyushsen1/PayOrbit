import { MigrationInterface, QueryRunner } from "typeorm";

export class ExpandEmployeeFields1788602368241 implements MigrationInterface {
    name = 'ExpandEmployeeFields1788602368241'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" ADD "manager_id" uuid`);
        await queryRunner.query(`ALTER TABLE "employees" ADD "working_schedule_id" uuid`);
        await queryRunner.query(`ALTER TABLE "employees" ADD "work_location" character varying`);
        await queryRunner.query(`ALTER TABLE "employees" ADD "company" character varying`);
        await queryRunner.query(`ALTER TABLE "employees" ADD "phone" character varying`);
        await queryRunner.query(`ALTER TABLE "employees" ADD "personal_email" character varying`);
        await queryRunner.query(`ALTER TABLE "employees" ADD "home_address" character varying`);
        await queryRunner.query(`ALTER TABLE "employees" ADD "date_of_birth" date`);
        await queryRunner.query(`ALTER TABLE "employees" ADD "emergency_contact_name" character varying`);
        await queryRunner.query(`ALTER TABLE "employees" ADD "emergency_contact_phone" character varying`);
        await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "FK_bcdf921072a19dd2758a628c5c0" FOREIGN KEY ("manager_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "FK_127223e87e8805493201963d89e" FOREIGN KEY ("working_schedule_id") REFERENCES "working_schedules"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "FK_127223e87e8805493201963d89e"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "FK_bcdf921072a19dd2758a628c5c0"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "emergency_contact_phone"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "emergency_contact_name"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "date_of_birth"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "home_address"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "personal_email"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "phone"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "company"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "work_location"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "working_schedule_id"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "manager_id"`);
    }

}
