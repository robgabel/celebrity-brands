# Migration Cleanup Guide

This guide will help you resolve all migration conflicts and make your database migrations idempotent.

## Current Issues

You have multiple migration files that:
1. Create duplicate policies with the same names
2. Try to create the same tables/indexes multiple times
3. Don't use proper idempotent patterns

## Solution Steps

### Step 1: Apply the Master Cleanup Migration

The cleanup migration `20250615020130_aged_limit.sql` will:
- Drop all conflicting policies
- Recreate them with consistent naming
- Ensure all operations are idempotent

```bash
npm run db:migrate
```

### Step 2: Make All Migrations Idempotent (Optional)

If you want to ensure all future migrations are safe:

```bash
npm run db:make-idempotent
```

This will rewrite all migration files to use proper idempotent patterns.

### Step 3: Full Reset (If Step 1 Fails)

If you still have conflicts after the cleanup migration:

```bash
npm run db:reset
```

**⚠️ WARNING: This will delete all data!**

## What Makes Migrations Idempotent

### ✅ Good Patterns

```sql
-- Tables
CREATE TABLE IF NOT EXISTS table_name (...);

-- Indexes
CREATE INDEX IF NOT EXISTS index_name ON table_name (column);

-- Extensions
CREATE EXTENSION IF NOT EXISTS "extension_name";

-- Functions
CREATE OR REPLACE FUNCTION function_name() ...

-- Policies (with proper cleanup)
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "policy_name" ON table_name;
END $$;
CREATE POLICY "policy_name" ON table_name ...

-- Types
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'type_name') THEN
    CREATE TYPE type_name AS ENUM (...);
  END IF;
END $$;

-- Columns
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'table_name' AND column_name = 'column_name'
  ) THEN
    ALTER TABLE table_name ADD COLUMN column_name type;
  END IF;
END $$;

-- Foreign Keys
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'constraint_name'
  ) THEN
    ALTER TABLE table_name ADD CONSTRAINT constraint_name FOREIGN KEY ...;
  END IF;
END $$;
```

### ❌ Bad Patterns

```sql
-- These will fail on second run:
CREATE TABLE table_name (...);
CREATE INDEX index_name ON table_name (column);
CREATE POLICY "policy_name" ON table_name ...
CREATE TYPE type_name AS ENUM (...);
ALTER TABLE table_name ADD COLUMN column_name type;
```

## Policy Naming Convention

Use consistent, descriptive names:

```sql
-- Format: {table}_{operation}_{scope}
CREATE POLICY "brands_select_public" ON brands FOR SELECT TO public ...
CREATE POLICY "brands_insert_authenticated" ON brands FOR INSERT TO authenticated ...
CREATE POLICY "user_profiles_update_own" ON user_profiles FOR UPDATE TO authenticated ...
```

## Testing Your Migrations

After cleanup, test that migrations can be run multiple times:

```bash
# Run migrations
npm run db:migrate

# Run again - should not produce errors
npm run db:migrate

# Check for any remaining issues
npm run db:status
```

## Common Error Messages and Solutions

### "policy already exists"
- **Cause**: Duplicate policy creation
- **Solution**: Use the cleanup migration or add `DROP POLICY IF EXISTS` before `CREATE POLICY`

### "relation already exists"
- **Cause**: Table/index created without `IF NOT EXISTS`
- **Solution**: Add `IF NOT EXISTS` to all `CREATE` statements

### "column already exists"
- **Cause**: `ALTER TABLE ADD COLUMN` without existence check
- **Solution**: Wrap in `DO` block with column existence check

### "constraint already exists"
- **Cause**: Foreign key or constraint added without existence check
- **Solution**: Wrap in `DO` block with constraint existence check

## Best Practices Going Forward

1. **Always use idempotent patterns** in new migrations
2. **Test migrations locally** before deploying
3. **Use descriptive policy names** to avoid conflicts
4. **Group related changes** in single migrations
5. **Add comments** explaining what each migration does
6. **Use the cleanup migration as a template** for proper patterns

## Emergency Recovery

If your database gets into an unrecoverable state:

```bash
# Full reset (DESTRUCTIVE - only for development)
npm run db:reset

# Or manually in Supabase dashboard:
# 1. Go to SQL Editor
# 2. Run: DROP SCHEMA public CASCADE; CREATE SCHEMA public;
# 3. Run your migrations again
```

## Files Modified

- `supabase/migrations/20250615020130_aged_limit.sql` - Master cleanup migration
- `scripts/make-migrations-idempotent.js` - Script to make all migrations idempotent
- `scripts/reset-database.js` - Database reset utility
- `package.json` - Added helpful npm scripts

## Support

If you continue to have issues:
1. Check the Supabase dashboard logs
2. Review the specific error messages
3. Ensure your environment variables are correct
4. Try the full reset option as a last resort