import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSalaryStructuresAndRules1788601333417 implements MigrationInterface {
    name = 'AddSalaryStructuresAndRules1788601333417'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."salary_rules_category_enum" AS ENUM('basic', 'allowance', 'deduction', 'gross', 'net')`);
        await queryRunner.query(`CREATE TYPE "public"."salary_rules_computation_method_enum" AS ENUM('fixed', 'percentage', 'formula')`);
        await queryRunner.query(`CREATE TABLE "salary_rules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "code" character varying NOT NULL, "category" "public"."salary_rules_category_enum" NOT NULL, "sequence" integer NOT NULL, "salary_structure_id" uuid NOT NULL, "computation_method" "public"."salary_rules_computation_method_enum" NOT NULL, "value" numeric(12,2), "formula" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d74fef3f2a320a5342d2fec2302" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "salary_structures" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1800f745fd1ebe08981cd422acd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "salary_rules" ADD CONSTRAINT "FK_dcc2819e85ba2902c2733c7b0ab" FOREIGN KEY ("salary_structure_id") REFERENCES "salary_structures"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "salary_rules" DROP CONSTRAINT "FK_dcc2819e85ba2902c2733c7b0ab"`);
        await queryRunner.query(`DROP TABLE "salary_structures"`);
        await queryRunner.query(`DROP TABLE "salary_rules"`);
        await queryRunner.query(`DROP TYPE "public"."salary_rules_computation_method_enum"`);
        await queryRunner.query(`DROP TYPE "public"."salary_rules_category_enum"`);
    }

}
