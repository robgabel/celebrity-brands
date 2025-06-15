#!/usr/bin/env node

/**
 * Migration Idempotency Script
 * 
 * This script rewrites all migration files to be idempotent.
 * It adds proper IF NOT EXISTS checks, DROP IF EXISTS statements,
 * and wraps operations in DO blocks where necessary.
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIGRATIONS_DIR = join(__dirname, '../supabase/migrations');

// Common patterns to make idempotent
const IDEMPOTENT_PATTERNS = {
  // Table creation
  'CREATE TABLE ': 'CREATE TABLE IF NOT EXISTS ',
  
  // Index creation
  'CREATE INDEX ': 'CREATE INDEX IF NOT EXISTS ',
  'CREATE UNIQUE INDEX ': 'CREATE UNIQUE INDEX IF NOT EXISTS ',
  
  // Extension creation
  'CREATE EXTENSION ': 'CREATE EXTENSION IF NOT EXISTS ',
  
  // Function creation
  'CREATE FUNCTION ': 'CREATE OR REPLACE FUNCTION ',
  
  // Type creation needs special handling
  'CREATE TYPE ': '-- CREATE TYPE (handled in DO block)',
  
  // Domain creation
  'CREATE DOMAIN ': '-- CREATE DOMAIN (handled in DO block)',
};

// Policy creation template
const POLICY_TEMPLATE = `
-- Drop and recreate policy: {POLICY_NAME}
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "{POLICY_NAME}" ON {TABLE_NAME};
END $$;

CREATE POLICY "{POLICY_NAME}"`;

// Trigger creation template
const TRIGGER_TEMPLATE = `
-- Drop and recreate trigger: {TRIGGER_NAME}
DROP TRIGGER IF EXISTS {TRIGGER_NAME} ON {TABLE_NAME};
CREATE TRIGGER {TRIGGER_NAME}`;

function makeFileIdempotent(filePath) {
  console.log(`Processing: ${filePath}`);
  
  let content = readFileSync(filePath, 'utf8');
  
  // Skip if already processed
  if (content.includes('-- IDEMPOTENT MIGRATION')) {
    console.log(`  ✓ Already idempotent`);
    return;
  }
  
  // Add header comment
  content = `-- IDEMPOTENT MIGRATION
-- This migration has been made idempotent and can be run multiple times safely.

${content}`;

  // Apply basic pattern replacements
  for (const [pattern, replacement] of Object.entries(IDEMPOTENT_PATTERNS)) {
    content = content.replaceAll(pattern, replacement);
  }
  
  // Handle CREATE TYPE statements
  content = handleCreateTypes(content);
  
  // Handle CREATE DOMAIN statements
  content = handleCreateDomains(content);
  
  // Handle CREATE POLICY statements
  content = handleCreatePolicies(content);
  
  // Handle CREATE TRIGGER statements
  content = handleCreateTriggers(content);
  
  // Handle ALTER TABLE ADD COLUMN statements
  content = handleAlterTableAddColumn(content);
  
  // Handle foreign key constraints
  content = handleForeignKeyConstraints(content);
  
  // Write back the modified content
  writeFileSync(filePath, content);
  console.log(`  ✓ Made idempotent`);
}

function handleCreateTypes(content) {
  const typeRegex = /-- CREATE TYPE \(handled in DO block\)\s+(\w+)\s+AS\s+ENUM\s*\((.*?)\);/gs;
  
  return content.replace(typeRegex, (match, typeName, enumValues) => {
    return `
-- Create type ${typeName} if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${typeName}') THEN
    CREATE TYPE ${typeName} AS ENUM (${enumValues});
  END IF;
END $$;`;
  });
}

function handleCreateDomains(content) {
  const domainRegex = /-- CREATE DOMAIN \(handled in DO block\)\s+(\w+)\s+AS\s+(.*?);/gs;
  
  return content.replace(domainRegex, (match, domainName, domainDef) => {
    return `
-- Create domain ${domainName} if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${domainName}') THEN
    CREATE DOMAIN ${domainName} AS ${domainDef};
  END IF;
END $$;`;
  });
}

function handleCreatePolicies(content) {
  const policyRegex = /CREATE POLICY\s+"([^"]+)"\s+ON\s+(\w+)/g;
  
  return content.replace(policyRegex, (match, policyName, tableName) => {
    return POLICY_TEMPLATE
      .replace(/{POLICY_NAME}/g, policyName)
      .replace(/{TABLE_NAME}/g, tableName) + 
      match.replace('CREATE POLICY', '');
  });
}

function handleCreateTriggers(content) {
  const triggerRegex = /CREATE TRIGGER\s+(\w+)\s+.*?\s+ON\s+(\w+)/g;
  
  return content.replace(triggerRegex, (match, triggerName, tableName) => {
    return TRIGGER_TEMPLATE
      .replace(/{TRIGGER_NAME}/g, triggerName)
      .replace(/{TABLE_NAME}/g, tableName) + 
      match.replace('CREATE TRIGGER', '');
  });
}

function handleAlterTableAddColumn(content) {
  const alterRegex = /ALTER TABLE\s+(\w+)\s+ADD COLUMN\s+([^;]+);/g;
  
  return content.replace(alterRegex, (match, tableName, columnDef) => {
    const columnName = columnDef.split(' ')[0];
    return `
-- Add column ${columnName} to ${tableName} if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = '${tableName}' AND column_name = '${columnName}'
  ) THEN
    ALTER TABLE ${tableName} ADD COLUMN ${columnDef};
  END IF;
END $$;`;
  });
}

function handleForeignKeyConstraints(content) {
  const fkRegex = /ALTER TABLE\s+(\w+)\s+ADD CONSTRAINT\s+(\w+)\s+FOREIGN KEY[^;]+;/g;
  
  return content.replace(fkRegex, (match, tableName, constraintName) => {
    return `
-- Add foreign key constraint ${constraintName} if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = '${constraintName}'
  ) THEN
    ${match.replace('ALTER TABLE', 'ALTER TABLE')}
  END IF;
END $$;`;
  });
}

function main() {
  console.log('🔄 Making all migrations idempotent...');
  console.log('=====================================');
  
  try {
    const migrationFiles = readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`Found ${migrationFiles.length} migration files`);
    
    for (const file of migrationFiles) {
      const filePath = join(MIGRATIONS_DIR, file);
      makeFileIdempotent(filePath);
    }
    
    console.log('\n✅ All migrations have been made idempotent!');
    console.log('\nNext steps:');
    console.log('1. Review the changes in your migration files');
    console.log('2. Test with: npm run db:migrate');
    console.log('3. If issues persist, use: npm run db:reset');
    
  } catch (error) {
    console.error('❌ Error processing migrations:', error);
    process.exit(1);
  }
}

main();