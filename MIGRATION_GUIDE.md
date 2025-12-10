# Database Migration Guide

## Overview

The application uses TypeORM for database management with two modes:

1. **Development Mode**: Auto-synchronization (`synchronize: true`)
2. **Production Mode**: Manual migrations (`synchronize: false`)

## Current Setup

### Development Mode (Default)
- Database schema automatically syncs with entity changes
- No manual migrations needed
- Enabled when `NODE_ENV=development`

### Production Mode
- Uses manual migrations for schema changes
- Safer for production environments
- Requires running migrations manually

## Migration Commands

### Show Current Migrations
```bash
npm run migration:show
```

### Run Pending Migrations
```bash
npm run migration:run
```

### Revert Last Migration
```bash
npm run migration:revert
```

### Generate New Migration (from entity changes)
```bash
npm run migration:generate src/migrations/MigrationName
```

### Create Empty Migration
```bash
npm run migration:create src/migrations/MigrationName
```

## How to Use Migrations

### For Development (Current Setup)
You don't need to run migrations! The app automatically creates/updates tables.

**Just start the server:**
```bash
npm run start:dev
```

The database schema will be automatically created/updated based on your entities.

### For Production

#### 1. Disable Auto-Sync
Update `.env.production`:
```env
NODE_ENV=production
```

#### 2. Run Migrations
```bash
npm run migration:run
```

#### 3. Start Server
```bash
npm run start:prod
```

## Creating Migrations

### Scenario 1: Entity Changes (Automatic)

1. **Modify your entity** (e.g., add a new field to User entity)

2. **Generate migration from changes:**
```bash
npm run migration:generate src/migrations/AddNewFieldToUser
```

3. **Review the generated migration file**

4. **Run the migration:**
```bash
npm run migration:run
```

### Scenario 2: Custom Migration (Manual)

1. **Create empty migration:**
```bash
npm run migration:create src/migrations/CustomMigration
```

2. **Edit the migration file:**
```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class CustomMigration1234567890000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Your SQL commands here
        await queryRunner.query(`
            ALTER TABLE "users" 
            ADD COLUMN "new_field" varchar(255)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert changes
        await queryRunner.query(`
            ALTER TABLE "users" 
            DROP COLUMN "new_field"
        `);
    }
}
```

3. **Run the migration:**
```bash
npm run migration:run
```

## Migration File Structure

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class MigrationName1234567890000 implements MigrationInterface {
    name = 'MigrationName1234567890000'

    // Apply changes
    public async up(queryRunner: QueryRunner): Promise<void> {
        // SQL commands to apply changes
    }

    // Revert changes
    public async down(queryRunner: QueryRunner): Promise<void> {
        // SQL commands to revert changes
    }
}
```

## Example Migrations

### Add New Column
```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "users" 
        ADD COLUMN "bio" text
    `);
}

public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "users" 
        DROP COLUMN "bio"
    `);
}
```

### Create Index
```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE INDEX "IDX_users_full_name" 
        ON "users" ("full_name")
    `);
}

public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP INDEX "IDX_users_full_name"
    `);
}
```

### Add Foreign Key
```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "posts" 
        ADD CONSTRAINT "FK_posts_user" 
        FOREIGN KEY ("user_id") 
        REFERENCES "users"("id") 
        ON DELETE CASCADE
    `);
}

public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "posts" 
        DROP CONSTRAINT "FK_posts_user"
    `);
}
```

## Current Database Schema

### Users Table
```sql
CREATE TABLE "users" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "email" varchar(255) UNIQUE,
    "phone" varchar(20) UNIQUE,
    "password_hash" text,
    "role" varchar DEFAULT 'USER',
    "full_name" varchar(255),
    "country" varchar(100),
    "division" varchar(100),
    "district" varchar(100),
    "google_id" varchar(255) UNIQUE,
    "facebook_id" varchar(255) UNIQUE,
    "profile_picture" text,
    "reset_token" varchar(255),
    "reset_token_expires" timestamp,
    "is_verified" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    CONSTRAINT "CHK_users_identifier" 
        CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL)
);

CREATE INDEX "IDX_users_email" ON "users" ("email");
CREATE INDEX "IDX_users_phone" ON "users" ("phone");
```

## Best Practices

### 1. Always Test Migrations
```bash
# Test on development database first
npm run migration:run

# If something goes wrong, revert
npm run migration:revert
```

### 2. Keep Migrations Small
- One logical change per migration
- Easier to debug and revert
- Better version control

### 3. Never Modify Existing Migrations
- Once deployed, migrations are immutable
- Create new migration to fix issues
- Use `migration:revert` to undo

### 4. Always Provide Down Migration
- Allows reverting changes
- Essential for rollbacks
- Test both up and down

### 5. Use Transactions
```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();
    try {
        await queryRunner.query(`...`);
        await queryRunner.query(`...`);
        await queryRunner.commitTransaction();
    } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
    }
}
```

## Troubleshooting

### Migration Already Exists
**Error:** Migration with this name already exists

**Solution:** Use a different name or delete the existing migration file

### No Changes Found
**Error:** No changes in database schema were found

**Solution:** 
- Your entities match the database
- Make changes to entities first
- Or use `migration:create` for custom migrations

### Migration Failed
**Error:** Migration execution failed

**Solution:**
1. Check the error message
2. Fix the SQL in migration file
3. Revert if needed: `npm run migration:revert`
4. Fix and run again

### TypeORM Command Not Found
**Error:** typeorm is not recognized

**Solution:**
```bash
# Install TypeORM globally
npm install -g typeorm

# Or use npm scripts
npm run migration:run
```

## Migration Workflow

### Development Workflow
```bash
# 1. Make changes to entities
# 2. Start dev server (auto-sync handles it)
npm run start:dev

# No migrations needed in development!
```

### Production Workflow
```bash
# 1. Make changes to entities
# 2. Generate migration
npm run migration:generate src/migrations/DescriptiveNameHere

# 3. Review generated migration
# 4. Test on staging database
npm run migration:run

# 5. Deploy to production
# 6. Run migrations on production
npm run migration:run

# 7. Start production server
npm run start:prod
```

## Configuration Files

### typeorm.config.ts
```typescript
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config({ path: '.env.development' });

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false, // Always false for migrations
});
```

### app.module.ts
```typescript
TypeOrmModule.forRootAsync({
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    // ... other config
    synchronize: config.get('NODE_ENV') === 'development',
    // Auto-sync in dev, manual migrations in prod
  })
})
```

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm run migration:show` | Show all migrations and their status |
| `npm run migration:run` | Run pending migrations |
| `npm run migration:revert` | Revert last migration |
| `npm run migration:generate src/migrations/Name` | Generate from entity changes |
| `npm run migration:create src/migrations/Name` | Create empty migration |

## Summary

✅ **Development**: Auto-sync enabled, no migrations needed
✅ **Production**: Use migrations for safety and control
✅ **Current Status**: Database schema is up-to-date
✅ **Initial Migration**: Created for documentation

**You're all set! Just run `npm run start:dev` and the database will be automatically managed.**
