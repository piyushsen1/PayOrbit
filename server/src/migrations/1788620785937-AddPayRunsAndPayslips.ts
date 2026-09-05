import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPayRunsAndPayslips1788620785937 implements MigrationInterface {
    name = 'AddPayRunsAndPayslips1788620785937'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."pay_runs_status_enum" AS ENUM('draft', 'validated', 'paid')`);
        await queryRunner.query(`CREATE TABLE "pay_runs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "salary_structure_id" uuid NOT NULL, "period_start" date NOT NULL, "period_end" date NOT NULL, "status" "public"."pay_runs_status_enum" NOT NULL DEFAULT 'draft', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bbc20ac26fb7af4af107955b3dd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."payslips_status_enum" AS ENUM('draft', 'validated', 'paid')`);
        await queryRunner.query(`CREATE TABLE "payslips" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "pay_run_id" uuid NOT NULL, "employee_id" uuid NOT NULL, "contract_id" uuid, "worked_days" numeric(6,2), "basic" numeric(12,2), "gross_total" numeric(12,2), "net_total" numeric(12,2), "warning" text, "status" "public"."payslips_status_enum" NOT NULL DEFAULT 'draft', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2b1cd07059daf60cc440c9976e1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."payslip_lines_category_enum" AS ENUM('basic', 'allowance', 'deduction', 'gross', 'net')`);
        await queryRunner.query(`CREATE TABLE "payslip_lines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "payslip_id" uuid NOT NULL, "salary_rule_id" uuid, "name" character varying NOT NULL, "code" character varying NOT NULL, "category" "public"."payslip_lines_category_enum" NOT NULL, "sequence" integer NOT NULL, "amount" numeric(12,2) NOT NULL, CONSTRAINT "PK_e2318c56871094d11383dd2ce42" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "pay_runs" ADD CONSTRAINT "FK_36d8ecb8826f82bed8f2f421b38" FOREIGN KEY ("salary_structure_id") REFERENCES "salary_structures"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payslips" ADD CONSTRAINT "FK_ba81be05cfa33a75ce1eb79ca36" FOREIGN KEY ("pay_run_id") REFERENCES "pay_runs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payslips" ADD CONSTRAINT "FK_3ca6cde51127cd649278d038ca9" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payslips" ADD CONSTRAINT "FK_71183dc084770f02d8b89200c37" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payslip_lines" ADD CONSTRAINT "FK_15abcac256683ae8c371bed1a11" FOREIGN KEY ("payslip_id") REFERENCES "payslips"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payslip_lines" ADD CONSTRAINT "FK_28a8c701affe05e48023bd37db3" FOREIGN KEY ("salary_rule_id") REFERENCES "salary_rules"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payslip_lines" DROP CONSTRAINT "FK_28a8c701affe05e48023bd37db3"`);
        await queryRunner.query(`ALTER TABLE "payslip_lines" DROP CONSTRAINT "FK_15abcac256683ae8c371bed1a11"`);
        await queryRunner.query(`ALTER TABLE "payslips" DROP CONSTRAINT "FK_71183dc084770f02d8b89200c37"`);
        await queryRunner.query(`ALTER TABLE "payslips" DROP CONSTRAINT "FK_3ca6cde51127cd649278d038ca9"`);
        await queryRunner.query(`ALTER TABLE "payslips" DROP CONSTRAINT "FK_ba81be05cfa33a75ce1eb79ca36"`);
        await queryRunner.query(`ALTER TABLE "pay_runs" DROP CONSTRAINT "FK_36d8ecb8826f82bed8f2f421b38"`);
        await queryRunner.query(`DROP TABLE "payslip_lines"`);
        await queryRunner.query(`DROP TYPE "public"."payslip_lines_category_enum"`);
        await queryRunner.query(`DROP TABLE "payslips"`);
        await queryRunner.query(`DROP TYPE "public"."payslips_status_enum"`);
        await queryRunner.query(`DROP TABLE "pay_runs"`);
        await queryRunner.query(`DROP TYPE "public"."pay_runs_status_enum"`);
    }

}
