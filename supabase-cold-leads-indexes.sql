-- Indexes for cold_leads table to optimize mobile dialer search performance
-- These indexes will significantly speed up filtering and searching operations

-- IMPORTANT: Enable the pg_trgm extension FIRST (required for trigram indexes)
-- This extension allows fast case-insensitive ILIKE searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index on company_name for searching and sorting
-- Using gin_trgm_ops for case-insensitive partial matching with ILIKE
CREATE INDEX IF NOT EXISTS idx_cold_leads_company_name_trgm 
ON cold_leads USING gin (company_name gin_trgm_ops);

-- Index on owner_name for searching
CREATE INDEX IF NOT EXISTS idx_cold_leads_owner_name_trgm 
ON cold_leads USING gin (owner_name gin_trgm_ops);

-- Index on phone_number for searching
CREATE INDEX IF NOT EXISTS idx_cold_leads_phone_number 
ON cold_leads (phone_number);

-- Index on city for filtering
CREATE INDEX IF NOT EXISTS idx_cold_leads_city 
ON cold_leads (city);

-- Index on state for filtering
CREATE INDEX IF NOT EXISTS idx_cold_leads_state 
ON cold_leads (state);

-- Index on practice_type for filtering
CREATE INDEX IF NOT EXISTS idx_cold_leads_practice_type 
ON cold_leads (practice_type);

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_cold_leads_state_city 
ON cold_leads (state, city);

CREATE INDEX IF NOT EXISTS idx_cold_leads_state_practice_type 
ON cold_leads (state, practice_type);

-- Analyze the table to update statistics for the query planner
ANALYZE cold_leads;

-- To verify indexes are being used, run:
-- EXPLAIN ANALYZE SELECT * FROM cold_leads WHERE company_name ILIKE '%search_term%';

