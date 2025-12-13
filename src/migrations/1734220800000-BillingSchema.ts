import { MigrationInterface, QueryRunner } from 'typeorm';

export class BillingSchema1734220800000 implements MigrationInterface {
  name = 'BillingSchema1734220800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create payment_config table
    await queryRunner.query(`
      CREATE TABLE "payment_config" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "key" varchar NOT NULL UNIQUE,
        "value" varchar NOT NULL,
        "description" varchar,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Create user_balances table
    await queryRunner.query(`
      CREATE TABLE "user_balances" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL UNIQUE,
        "free_minutes" int NOT NULL DEFAULT 0,
        "free_minutes_used" int NOT NULL DEFAULT 0,
        "paid_minutes" int NOT NULL DEFAULT 0,
        "paid_minutes_used" int NOT NULL DEFAULT 0,
        "total_spent" decimal(10,2) NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_user_balances_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create enum types for transactions
    await queryRunner.query(`
      CREATE TYPE "transaction_type_enum" AS ENUM (
        'PURCHASE', 'USAGE', 'ADMIN_CREDIT', 'REFUND', 'BONUS'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "transaction_status_enum" AS ENUM (
        'PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "payment_method_enum" AS ENUM (
        'STRIPE', 'SSLCOMMERZ', 'BKASH', 'NAGAD', 'ADMIN', 'SYSTEM'
      )
    `);

    // Create transactions table
    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "type" "transaction_type_enum" NOT NULL,
        "status" "transaction_status_enum" NOT NULL DEFAULT 'PENDING',
        "payment_method" "payment_method_enum",
        "minutes" int NOT NULL DEFAULT 0,
        "amount" decimal(10,2) NOT NULL DEFAULT 0,
        "currency" varchar NOT NULL DEFAULT 'BDT',
        "external_transaction_id" varchar,
        "call_session_id" varchar,
        "metadata" jsonb,
        "description" varchar,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_transactions_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for transactions
    await queryRunner.query(`
      CREATE INDEX "idx_transactions_user_id" ON "transactions"("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_transactions_type" ON "transactions"("type")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_transactions_status" ON "transactions"("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_transactions_created_at" ON "transactions"("created_at")
    `);

    // Insert default config values
    await queryRunner.query(`
      INSERT INTO "payment_config" ("key", "value", "description") VALUES
        ('free_minutes', '30', 'Free minutes given to new users'),
        ('price_per_minute', '2.00', 'Price per minute in BDT'),
        ('min_purchase_minutes', '10', 'Minimum minutes that can be purchased'),
        ('currency', 'BDT', 'Currency code for payments')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_balances"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_config"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_method_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "transaction_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "transaction_type_enum"`);
  }
}
