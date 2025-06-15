#!/usr/bin/env node

/**
 * Migration Validation Script
 * 
 * This script validates that all migrations are idempotent and
 * checks for common issues that cause conflicts.
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIGRATIONS_DIR = join(__dirname, '../supabase/migrations');

// Patterns that indicate non-idempotent operations
const NON_IDEMPOTENT_PATTERNS = [
  /CREATE TABLE\s+(?!IF NOT EXISTS)\w+/g,
  /CREATE INDEX\s+(?!IF NOT EXISTS)\w+/g,
  /CREATE UNIQUE INDEX\s+(?!IF NOT EXISTS)\w+/g,
  /CREATE EXTENSION\s+(?!IF NOT EXISTS)/g,
  /CREATE FUNCTION\s+(?!.*OR REPLACE)/g,
  /CREATE POLICY\s+"[^"]+"\s+ON\s+\w+(?!\s*--\s*idempotent)/g,
  /ALTER TABLE\s+\w+\s+ADD COLUMN\s+(?!.*IF NOT EXISTS)/g,
  /CREATE TYPE\s+(?!.*IF NOT EXISTS)/g,
];

// Policy names that commonly conflict
const COMMON_POLICY_CONFLICTS = [
  'Enable public read access',
  'Users can create',
  'Users can read',
  'Users can update',
  'Users can delete',
  'Public can read',
  'Authenticated users can',
];

function validateMigration(filePath) {
  const fileName = filePath.split('/').pop();
  const content = readFileSync(filePath, 'utf8');
  const issues = [];

  // Check for non-idempotent patterns
  NON_IDEMPOTENT_PATTERNS.forEach((pattern, index) => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        issues.push({
          type: 'non-idempotent',
          pattern: match,
          suggestion: getSuggestion(match, index)
        });
      });
    }
  });

  // Check for common policy name conflicts
  COMMON_POLICY_CONFLICTS.forEach(policyName => {
    if (content.includes(`"${policyName}"`)) {
      issues.push({
        type: 'policy-conflict',
        pattern: policyName,
        suggestion: `Use more specific policy name like "table_operation_scope"`
      });
    }
  });

  // Check for missing RLS enable statements
  const createTableMatches = content.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/g);
  if (createTableMatches) {
    createTableMatches.forEach(match => {
      const tableName = match.split(' ').pop();
      if (!content.includes(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY`)) {
        issues.push({
          type: 'missing-rls',
          pattern: tableName,
          suggestion: `Add "ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;"`
        });
      }
    });
  }

  return { fileName, issues };
}

function getSuggestion(match, patternIndex) {
  const suggestions = [
    'Use "CREATE TABLE IF NOT EXISTS"',
    'Use "CREATE INDEX IF NOT EXISTS"',
    'Use "CREATE UNIQUE INDEX IF NOT EXISTS"',
    'Use "CREATE EXTENSION IF NOT EXISTS"',
    'Use "CREATE OR REPLACE FUNCTION"',
    'Add "DROP POLICY IF EXISTS" before CREATE POLICY',
    'Wrap in DO block with column existence check',
    'Wrap in DO block with type existence check',
  ];
  
  return suggestions[patternIndex] || 'Make this operation idempotent';
}

function main() {
  console.log('🔍 Validating migration files...');
  console.log('==================================');
  
  try {
    const migrationFiles = readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    let totalIssues = 0;
    const problemFiles = [];
    
    for (const file of migrationFiles) {
      const filePath = join(MIGRATIONS_DIR, file);
      const validation = validateMigration(filePath);
      
      if (validation.issues.length > 0) {
        problemFiles.push(validation);
        totalIssues += validation.issues.length;
      }
    }
    
    if (totalIssues === 0) {
      console.log('✅ All migrations look good!');
      console.log(`Checked ${migrationFiles.length} files, no issues found.`);
    } else {
      console.log(`❌ Found ${totalIssues} issues in ${problemFiles.length} files:\n`);
      
      problemFiles.forEach(({ fileName, issues }) => {
        console.log(`📄 ${fileName}:`);
        issues.forEach((issue, index) => {
          console.log(`  ${index + 1}. [${issue.type.toUpperCase()}] ${issue.pattern}`);
          console.log(`     💡 ${issue.suggestion}\n`);
        });
      });
      
      console.log('🔧 To fix these issues:');
      console.log('1. Run: npm run db:make-idempotent');
      console.log('2. Or manually apply the suggestions above');
      console.log('3. Then run: npm run db:migrate');
    }
    
  } catch (error) {
    console.error('❌ Error validating migrations:', error);
    process.exit(1);
  }
}

main();