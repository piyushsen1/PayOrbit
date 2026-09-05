import { MigrationInterface, QueryRunner } from "typeorm";

export class AddContracts1788603301052 implements MigrationInterface {
    name = 'AddContracts1788603301052'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "contracts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "contract_number" character varying NOT NULL, "employee_id" uuid NOT NULL, "department" character varying, "job_position" character varying, "start_date" date NOT NULL, "end_date" date, "wage_per_month" numeric(12,2) NOT NULL, "working_schedule_id" uuid, "salary_structure_id" uuid, "notes" text NOT NULL DEFAULT '', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_db84c172dc74e6271e614b68fbd" UNIQUE ("contract_number"), CONSTRAINT "PK_2c7b8f3a7b1acdd49497d83d0fb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "contracts" ADD CONSTRAINT "FK_c8e795ea857e404f9a2b6133208" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "contracts" ADD CONSTRAINT "FK_e056f8b493dadaa241308294da3" FOREIGN KEY ("working_schedule_id") REFERENCES "working_schedules"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "contracts" ADD CONSTRAINT "FK_b1470535fb79f9c10cd7bb4cd89" FOREIGN KEY ("salary_structure_id") REFERENCES "salary_structures"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contracts" DROP CONSTRAINT "FK_b1470535fb79f9c10cd7bb4cd89"`);
        await queryRunner.query(`ALTER TABLE "contracts" DROP CONSTRAINT "FK_e056f8b493dadaa241308294da3"`);
        await queryRunner.query(`ALTER TABLE "contracts" DROP CONSTRAINT "FK_c8e795ea857e404f9a2b6133208"`);
        await queryRunner.query(`DROP TABLE "contracts"`);
    }

}
