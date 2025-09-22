-- Supabase Database Schema for Leads Table
-- Door2Door V2 CRM - Cold Calling Pipeline

-- Create ENUM for meeting status (drop first if exists)
DROP TYPE IF EXISTS meeting_status_enum CASCADE;
CREATE TYPE meeting_status_enum AS ENUM ('Scheduled', 'Cancelled', 'Ran');

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Core lead information
    company_name TEXT NOT NULL,
    practice_type TEXT NOT NULL,
    url TEXT,
    phone_number TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    
    -- Meeting details
    time TEXT,
    date_booked DATE,
    meeting_date DATE,
    meeting_status meeting_status_enum NOT NULL DEFAULT 'Scheduled',
    
    -- Follow-up information
    next_step TEXT,
    credit TEXT,
    
    -- CRM tracking fields
    lead_source TEXT NOT NULL DEFAULT 'Cold Call',
    assigned_rep TEXT,
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_company_name ON leads(company_name);
CREATE INDEX IF NOT EXISTS idx_leads_practice_type ON leads(practice_type);
CREATE INDEX IF NOT EXISTS idx_leads_meeting_status ON leads(meeting_status);
CREATE INDEX IF NOT EXISTS idx_leads_meeting_date ON leads(meeting_date);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_rep ON leads(assigned_rep);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at 
    BEFORE UPDATE ON leads 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (you can restrict this later)
DROP POLICY IF EXISTS "Allow all operations on leads" ON leads;
CREATE POLICY "Allow all operations on leads" ON leads
    FOR ALL USING (true);
