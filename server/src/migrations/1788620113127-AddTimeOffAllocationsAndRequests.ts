import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTimeOffAllocationsAndRequests1788620113127 implements MigrationInterface {
    name = 'AddTimeOffAllocationsAndRequests1788620113127'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."time_off_allocations_status_enum" AS ENUM('pending', 'approved', 'refused')`);
        await queryRunner.query(`CREATE TABLE "time_off_allocations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "employee_id" uuid NOT NULL, "time_off_type_id" uuid NOT NULL, "allocated" numeric(8,2) NOT NULL, "status" "public"."time_off_allocations_status_enum" NOT NULL DEFAULT 'pending', "approver_id" uuid, "valid_from" date, "valid_to" date, "description" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b3dd4ee513f5e7b3b3d79485780" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."time_off_requests_status_enum" AS ENUM('pending', 'approved', 'refused')`);
        await queryRunner.query(`CREATE TABLE "time_off_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "employee_id" uuid NOT NULL, "time_off_type_id" uuid NOT NULL, "allocation_id" uuid, "start_date" date NOT NULL, "end_date" date NOT NULL, "duration" numeric(8,2) NOT NULL, "reason" text, "status" "public"."time_off_requests_status_enum" NOT NULL DEFAULT 'pending', "approver_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d2dc15201117320068bbc641715" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "time_off_allocations" ADD CONSTRAINT "FK_f7e97e09db20324273a0155ccde" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "time_off_allocations" ADD CONSTRAINT "FK_106c932fb1863e020352625dc5c" FOREIGN KEY ("time_off_type_id") REFERENCES "time_off_types"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "time_off_allocations" ADD CONSTRAINT "FK_8a36a17bc045b016c82054fbb23" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "time_off_requests" ADD CONSTRAINT "FK_6944dd5929f7204520fb55d25d9" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "time_off_requests" ADD CONSTRAINT "FK_34c64444fb839d4eb9e246c5a15" FOREIGN KEY ("time_off_type_id") REFERENCES "time_off_types"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "time_off_requests" ADD CONSTRAINT "FK_55987168090d93becb5fdf7a122" FOREIGN KEY ("allocation_id") REFERENCES "time_off_allocations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "time_off_requests" ADD CONSTRAINT "FK_35277acaa296044187c3bee67f4" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "time_off_requests" DROP CONSTRAINT "FK_35277acaa296044187c3bee67f4"`);
        await queryRunner.query(`ALTER TABLE "time_off_requests" DROP CONSTRAINT "FK_55987168090d93becb5fdf7a122"`);
        await queryRunner.query(`ALTER TABLE "time_off_requests" DROP CONSTRAINT "FK_34c64444fb839d4eb9e246c5a15"`);
        await queryRunner.query(`ALTER TABLE "time_off_requests" DROP CONSTRAINT "FK_6944dd5929f7204520fb55d25d9"`);
        await queryRunner.query(`ALTER TABLE "time_off_allocations" DROP CONSTRAINT "FK_8a36a17bc045b016c82054fbb23"`);
        await queryRunner.query(`ALTER TABLE "time_off_allocations" DROP CONSTRAINT "FK_106c932fb1863e020352625dc5c"`);
        await queryRunner.query(`ALTER TABLE "time_off_allocations" DROP CONSTRAINT "FK_f7e97e09db20324273a0155ccde"`);
        await queryRunner.query(`DROP TABLE "time_off_requests"`);
        await queryRunner.query(`DROP TYPE "public"."time_off_requests_status_enum"`);
        await queryRunner.query(`DROP TABLE "time_off_allocations"`);
        await queryRunner.query(`DROP TYPE "public"."time_off_allocations_status_enum"`);
    }

}
