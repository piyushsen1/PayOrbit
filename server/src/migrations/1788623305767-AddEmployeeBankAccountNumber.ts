import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmployeeBankAccountNumber1788623305767 implements MigrationInterface {
    name = 'AddEmployeeBankAccountNumber1788623305767'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" ADD "bank_account_number" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "bank_account_number"`);
    }

}
