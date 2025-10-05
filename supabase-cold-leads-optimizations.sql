-- Database optimizations for cold leads filtering
-- Add indexes for better filtering performance

-- Basic indexes for filtering
CREATE INDEX IF NOT EXISTS idx_cold_leads_state ON cold_leads(state);
CREATE INDEX IF NOT EXISTS idx_cold_leads_city ON cold_leads(city);
CREATE INDEX IF NOT EXISTS idx_cold_leads_practice_type ON cold_leads(practice_type);
CREATE INDEX IF NOT EXISTS idx_cold_leads_company_name ON cold_leads(company_name);
CREATE INDEX IF NOT EXISTS idx_cold_leads_owner_name ON cold_leads(owner_name);

-- Composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_cold_leads_state_city ON cold_leads(state, city);
CREATE INDEX IF NOT EXISTS idx_cold_leads_practice_state ON cold_leads(practice_type, state);

-- Full text search index for better search performance
CREATE INDEX IF NOT EXISTS idx_cold_leads_search ON cold_leads USING gin(
  to_tsvector('english', 
    coalesce(company_name, '') || ' ' || 
    coalesce(owner_name, '') || ' ' || 
    coalesce(practice_type, '') || ' ' || 
    coalesce(city, '') || ' ' || 
    coalesce(state, '')
  )
);
