import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1732593600000 implements MigrationInterface {
    name = 'InitialSchema1732593600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create users table
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying(255),
                "phone" character varying(20),
                "password_hash" text,
                "role" character varying NOT NULL DEFAULT 'USER',
                "full_name" character varying(255),
                "country" character varying(100),
                "division" character varying(100),
                "district" character varying(100),
                "google_id" character varying(255),
                "facebook_id" character varying(255),
                "profile_picture" text,
                "reset_token" character varying(255),
                "reset_token_expires" TIMESTAMP,
                "is_verified" boolean NOT NULL DEFAULT false,
                "is_active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_users" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_users_email" UNIQUE ("email"),
                CONSTRAINT "UQ_users_phone" UNIQUE ("phone"),
                CONSTRAINT "UQ_users_google_id" UNIQUE ("google_id"),
                CONSTRAINT "UQ_users_facebook_id" UNIQUE ("facebook_id"),
                CONSTRAINT "CHK_users_identifier" CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL)
            )
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users" ("email")`);
        await queryRunner.query(`CREATE INDEX "IDX_users_phone" ON "users" ("phone")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_users_phone"`);
        await queryRunner.query(`DROP INDEX "IDX_users_email"`);
        
        // Drop table
        await queryRunner.query(`DROP TABLE "users"`);
    }
}
