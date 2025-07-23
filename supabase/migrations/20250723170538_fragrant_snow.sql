/*
  # Drop Duplicate Embedding Index

  1. Issue Resolution
    - Remove duplicate index `idx_brands_embedding` 
    - Keep the specialized `brands_embedding_idx` which uses ivfflat for vector operations
    
  2. Performance Impact
    - Reduces storage overhead
    - Improves insert/update/delete performance on brands table
    - Maintains optimal vector search performance with the ivfflat index
*/

-- Drop the duplicate embedding index
-- Keep brands_embedding_idx as it's specifically configured for vector operations
DROP INDEX IF EXISTS idx_brands_embedding;