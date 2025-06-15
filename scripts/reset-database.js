#!/usr/bin/env node

/**
 * Database Reset and Migration Script
 * 
 * This script helps reset your local Supabase database and apply migrations cleanly.
 * Use this when you have migration conflicts that are difficult to resolve.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   VITE_SUPABASE_URL:', SUPABASE_URL ? '✓' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓' : '❌');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function resetDatabase() {
  console.log('🔄 Starting database reset...');
  
  try {
    // List all tables to drop (except system tables)
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .neq('table_name', 'schema_migrations');

    if (tablesError) {
      console.error('❌ Error fetching tables:', tablesError);
      return false;
    }

    // Drop all tables
    for (const table of tables || []) {
      console.log(`   Dropping table: ${table.table_name}`);
      const { error } = await supabase.rpc('exec_sql', {
        sql: `DROP TABLE IF EXISTS "${table.table_name}" CASCADE;`
      });
      
      if (error) {
        console.warn(`   ⚠️  Warning dropping ${table.table_name}:`, error.message);
      }
    }

    console.log('✅ Database reset complete');
    return true;
  } catch (error) {
    console.error('❌ Error during database reset:', error);
    return false;
  }
}

async function applyMigrations() {
  console.log('🔄 Applying migrations...');
  
  try {
    const migrationsDir = join(__dirname, '../supabase/migrations');
    const migrationFiles = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`   Found ${migrationFiles.length} migration files`);

    for (const file of migrationFiles) {
      console.log(`   Applying: ${file}`);
      
      const migrationPath = join(migrationsDir, file);
      const migrationSQL = readFileSync(migrationPath, 'utf8');
      
      const { error } = await supabase.rpc('exec_sql', {
        sql: migrationSQL
      });
      
      if (error) {
        console.error(`   ❌ Error in ${file}:`, error.message);
        return false;
      }
    }

    console.log('✅ All migrations applied successfully');
    return true;
  } catch (error) {
    console.error('❌ Error applying migrations:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Database Reset and Migration Tool');
  console.log('=====================================');
  
  const args = process.argv.slice(2);
  const shouldReset = args.includes('--reset');
  
  if (shouldReset) {
    console.log('⚠️  WARNING: This will delete ALL data in your database!');
    console.log('   This should only be used in development environments.');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const resetSuccess = await resetDatabase();
    if (!resetSuccess) {
      console.error('❌ Database reset failed');
      process.exit(1);
    }
  }
  
  const migrationSuccess = await applyMigrations();
  if (!migrationSuccess) {
    console.error('❌ Migration application failed');
    process.exit(1);
  }
  
  console.log('🎉 Database setup complete!');
}

// Handle command line arguments
if (process.argv.includes('--help')) {
  console.log(`
Database Reset and Migration Tool

Usage:
  node scripts/reset-database.js [options]

Options:
  --reset    Reset the database before applying migrations (DESTRUCTIVE!)
  --help     Show this help message

Examples:
  node scripts/reset-database.js                # Apply migrations only
  node scripts/reset-database.js --reset        # Reset database and apply migrations
`);
  process.exit(0);
}

main().catch(console.error);