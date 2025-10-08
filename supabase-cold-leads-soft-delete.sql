-- Soft Delete Migration for cold_leads table
-- This migration adds support for soft deletes to prevent re-adding disqualified leads
-- when running the lead generation workflow again in the same area.

-- Add deleted_at column if it doesn't exist
ALTER TABLE cold_leads 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add partial index for efficient filtering of active (non-deleted) leads
-- This index only indexes rows where deleted_at IS NULL, making queries faster
CREATE INDEX IF NOT EXISTS idx_cold_leads_deleted_at 
ON cold_leads(deleted_at) 
WHERE deleted_at IS NULL;

-- Add index for checking all leads (including deleted) for duplicate prevention
-- This helps n8n quickly check if a lead already exists (deleted or not)
CREATE INDEX IF NOT EXISTS idx_cold_leads_phone_all 
ON cold_leads(phone);

CREATE INDEX IF NOT EXISTS idx_cold_leads_company_phone 
ON cold_leads(company_name, phone);

-- Add comment to document the soft delete pattern
COMMENT ON COLUMN cold_leads.deleted_at IS 
'Soft delete timestamp. NULL = active lead (shown in UI). 
When set, indicates the lead was disqualified/deleted by user. 
Used to prevent re-adding disqualified leads during lead generation workflows.';

-- Example queries for n8n workflow:

-- Query 1: Check if lead exists (including deleted ones) to prevent duplicates
-- SELECT EXISTS(SELECT 1 FROM cold_leads WHERE phone = $phone) as lead_exists;

-- Query 2: Get all existing phones in an area (including deleted) for bulk duplicate check
-- SELECT phone FROM cold_leads WHERE city = $city AND state = $state;

-- Query 3: Only insert if lead doesn't exist (checks both active and deleted)
-- INSERT INTO cold_leads (company_name, phone, owner_name, ...)
-- SELECT $company_name, $phone, $owner_name, ...
-- WHERE NOT EXISTS (
--   SELECT 1 FROM cold_leads WHERE phone = $phone
-- );

