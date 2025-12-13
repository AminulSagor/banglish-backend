import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompleteSchema1733836800000 implements MigrationInterface {
  name = 'CompleteSchema1733836800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension if not already enabled
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ==================== USERS TABLE ====================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying(255),
        "phone" character varying(20),
        "password_hash" text,
        "role" character varying NOT NULL DEFAULT 'USER',
        "google_id" character varying(255),
        "facebook_id" character varying(255),
        "reset_token" character varying(255),
        "reset_token_expires" TIMESTAMP,
        "refresh_token" text,
        "is_verified" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        "is_online" boolean NOT NULL DEFAULT false,
        "last_seen" TIMESTAMP,
        "socket_id" character varying(255),
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

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_email" ON "users" ("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_phone" ON "users" ("phone")`,
    );

    // ==================== LANGUAGES TABLE ====================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "languages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(100) NOT NULL,
        "code" character varying(10) NOT NULL,
        "native_name" character varying(100),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_languages" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_languages_name" UNIQUE ("name"),
        CONSTRAINT "UQ_languages_code" UNIQUE ("code")
      )
    `);

    // ==================== PROFILES TABLE ====================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "profiles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "full_name" character varying(255),
        "country" character varying(100),
        "division" character varying(100),
        "district" character varying(100),
        "profile_picture" text,
        "bio" text,
        "date_of_birth" date,
        "gender" character varying(20),
        "address" character varying(255),
        "postal_code" character varying(20),
        "own_language" character varying(100),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_profiles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_profiles_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_profiles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_profiles_own_language" ON "profiles" ("own_language")`,
    );

    // ==================== PROFILE_INTERESTED_LANGUAGES (Join Table) ====================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "profile_interested_languages" (
        "profile_id" uuid NOT NULL,
        "language_id" uuid NOT NULL,
        CONSTRAINT "PK_profile_interested_languages" PRIMARY KEY ("profile_id", "language_id"),
        CONSTRAINT "FK_profile_interested_languages_profile" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_profile_interested_languages_language" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_profile_interested_languages_profile" ON "profile_interested_languages" ("profile_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_profile_interested_languages_language" ON "profile_interested_languages" ("language_id")`,
    );

    // ==================== CHAT_ROOMS TABLE ====================
    await queryRunner.query(`
      CREATE TYPE IF NOT EXISTS "room_type_enum" AS ENUM ('direct', 'group')
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat_rooms" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(100),
        "description" text,
        "type" "room_type_enum" NOT NULL DEFAULT 'group',
        "avatar_url" character varying(500),
        "created_by" uuid NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_chat_rooms" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chat_rooms_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // ==================== CHAT_ROOM_MEMBERS (Join Table) ====================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat_room_members" (
        "room_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        CONSTRAINT "PK_chat_room_members" PRIMARY KEY ("room_id", "user_id"),
        CONSTRAINT "FK_chat_room_members_room" FOREIGN KEY ("room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_chat_room_members_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_chat_room_members_room" ON "chat_room_members" ("room_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_chat_room_members_user" ON "chat_room_members" ("user_id")`,
    );

    // ==================== CHAT_ROOM_ADMINS (Join Table) ====================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat_room_admins" (
        "room_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        CONSTRAINT "PK_chat_room_admins" PRIMARY KEY ("room_id", "user_id"),
        CONSTRAINT "FK_chat_room_admins_room" FOREIGN KEY ("room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_chat_room_admins_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_chat_room_admins_room" ON "chat_room_admins" ("room_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_chat_room_admins_user" ON "chat_room_admins" ("user_id")`,
    );

    // ==================== MESSAGES TABLE ====================
    await queryRunner.query(`
      CREATE TYPE IF NOT EXISTS "message_type_enum" AS ENUM ('text', 'image', 'file', 'system')
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "content" text NOT NULL,
        "type" "message_type_enum" NOT NULL DEFAULT 'text',
        "sender_id" uuid NOT NULL,
        "receiver_id" uuid,
        "room_id" uuid,
        "is_read" boolean NOT NULL DEFAULT false,
        "read_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_messages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_messages_sender" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_messages_receiver" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_messages_room" FOREIGN KEY ("room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_messages_sender" ON "messages" ("sender_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_messages_receiver" ON "messages" ("receiver_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_messages_room" ON "messages" ("room_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_messages_created_at" ON "messages" ("created_at")`,
    );

    // ==================== CALL_SESSIONS TABLE ====================
    await queryRunner.query(`
      CREATE TYPE IF NOT EXISTS "call_type_enum" AS ENUM ('DIRECT', 'GROUP')
    `);

    await queryRunner.query(`
      CREATE TYPE IF NOT EXISTS "call_status_enum" AS ENUM ('RINGING', 'ONGOING', 'ENDED')
    `);

    await queryRunner.query(`
      CREATE TYPE IF NOT EXISTS "call_end_reason_enum" AS ENUM ('COMPLETED', 'MISSED', 'REJECTED', 'CANCELLED')
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "call_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "caller_id" uuid NOT NULL,
        "receiver_id" uuid,
        "room_id" uuid,
        "host_id" uuid,
        "call_type" "call_type_enum" NOT NULL DEFAULT 'DIRECT',
        "call_status" "call_status_enum" NOT NULL DEFAULT 'RINGING',
        "end_reason" "call_end_reason_enum",
        "started_at" TIMESTAMP,
        "ended_at" TIMESTAMP,
        "participants" text NOT NULL DEFAULT '',
        "participant_details" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_call_sessions" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_call_sessions_caller" ON "call_sessions" ("caller_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_call_sessions_receiver" ON "call_sessions" ("receiver_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_call_sessions_room" ON "call_sessions" ("room_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_call_sessions_status" ON "call_sessions" ("call_status")`,
    );

    // ==================== SEED DEFAULT LANGUAGES ====================
    await queryRunner.query(`
      INSERT INTO "languages" ("name", "code", "native_name") VALUES
        ('English', 'en', 'English'),
        ('Bengali', 'bn', 'বাংলা'),
        ('Hindi', 'hi', 'हिन्दी'),
        ('Arabic', 'ar', 'العربية'),
        ('Spanish', 'es', 'Español'),
        ('French', 'fr', 'Français'),
        ('German', 'de', 'Deutsch'),
        ('Chinese', 'zh', '中文'),
        ('Japanese', 'ja', '日本語'),
        ('Korean', 'ko', '한국어'),
        ('Portuguese', 'pt', 'Português'),
        ('Russian', 'ru', 'Русский'),
        ('Italian', 'it', 'Italiano'),
        ('Turkish', 'tr', 'Türkçe'),
        ('Urdu', 'ur', 'اردو')
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting foreign key constraints)
    await queryRunner.query(`DROP TABLE IF EXISTS "call_sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_room_admins"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_room_members"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_rooms"`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "profile_interested_languages"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "profiles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "languages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "call_end_reason_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "call_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "call_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "message_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "room_type_enum"`);
  }
}
