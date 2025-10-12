-- Fix lead_notes foreign key constraint to support both cold_leads and engaged_leads
-- This migration removes the restrictive foreign key constraint

-- Step 1: Drop the existing foreign key constraint that only allows cold_leads
ALTER TABLE public.lead_notes 
DROP CONSTRAINT IF EXISTS lead_notes_lead_id_fkey;

-- Step 2: Add a more flexible foreign key constraint that allows both tables
-- Note: This creates a foreign key that references both cold_leads and engaged_leads
-- Since PostgreSQL doesn't support direct foreign keys to multiple tables,
-- we'll use a check constraint with a trigger function for validation

-- Step 3: Create trigger function to validate lead_id exists in either table
CREATE OR REPLACE FUNCTION validate_lead_notes_lead_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow NULL lead_id
  IF NEW.lead_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if lead_id exists in cold_leads or engaged_leads
  IF NOT EXISTS (
    SELECT 1 FROM public.cold_leads WHERE id = NEW.lead_id
    UNION ALL
    SELECT 1 FROM public.engaged_leads WHERE id = NEW.lead_id
  ) THEN
    RAISE EXCEPTION 'lead_id % does not exist in cold_leads or engaged_leads tables', NEW.lead_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger to enforce validation
DROP TRIGGER IF EXISTS trigger_validate_lead_notes_lead_id ON public.lead_notes;
CREATE TRIGGER trigger_validate_lead_notes_lead_id
  BEFORE INSERT OR UPDATE ON public.lead_notes
  FOR EACH ROW
  EXECUTE FUNCTION validate_lead_notes_lead_id();

-- Step 5: Add comments for documentation
COMMENT ON FUNCTION validate_lead_notes_lead_id() IS 
'Trigger function to validate that lead_id exists in cold_leads or engaged_leads tables';

-- Step 6: Grant necessary permissions
GRANT EXECUTE ON FUNCTION validate_lead_notes_lead_id() TO authenticated;
