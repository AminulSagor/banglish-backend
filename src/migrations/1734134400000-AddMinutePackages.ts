import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMinutePackages1734134400000 implements MigrationInterface {
  name = 'AddMinutePackages1734134400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "minute_packages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" text,
        "minutes" integer NOT NULL,
        "price" numeric(10,2) NOT NULL,
        "currency" character varying NOT NULL DEFAULT 'BDT',
        "discount_percent" integer NOT NULL DEFAULT 0,
        "original_price" numeric(10,2),
        "badge" character varying,
        "sort_order" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "is_featured" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_minute_packages" PRIMARY KEY ("id")
      )
    `);

    // Seed default packages
    await queryRunner.query(`
      INSERT INTO "minute_packages" ("name", "description", "minutes", "price", "currency", "discount_percent", "original_price", "badge", "sort_order", "is_active", "is_featured")
      VALUES 
        ('Starter Pack', 'Perfect for trying out our service', 30, 50.00, 'BDT', 0, NULL, NULL, 1, true, false),
        ('Popular Pack', 'Best value for regular users', 100, 150.00, 'BDT', 10, 166.00, 'Most Popular', 2, true, true),
        ('Premium Pack', 'For power users who need more minutes', 300, 400.00, 'BDT', 20, 500.00, 'Best Value', 3, true, false),
        ('Enterprise Pack', 'Maximum minutes at the best rate', 1000, 1200.00, 'BDT', 25, 1600.00, 'Enterprise', 4, true, false)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "minute_packages"`);
  }
}
