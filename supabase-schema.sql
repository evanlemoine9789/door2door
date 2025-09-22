
-- Supabase Database Schema for Door2Door V2 CRM
-- This file contains the SQL commands to create the necessary tables

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create leads table
CREATE TABLE leads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    contact_role VARCHAR(100) NOT NULL,
    meeting_status VARCHAR(50) NOT NULL CHECK (meeting_status IN ('scheduled', 'cancelled', 'completed', 'pending')),
    meeting_date DATE,
    date_booked DATE NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    url TEXT,
    rep VARCHAR(255),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add indexes for better query performance
    CONSTRAINT valid_meeting_date CHECK (meeting_date >= date_booked)
);

-- Create index on commonly queried fields
CREATE INDEX idx_leads_company ON leads(company);
CREATE INDEX idx_leads_contact_name ON leads(contact_name);
CREATE INDEX idx_leads_meeting_status ON leads(meeting_status);
CREATE INDEX idx_leads_meeting_date ON leads(meeting_date);
CREATE INDEX idx_leads_rep ON leads(rep);
CREATE INDEX idx_leads_created_at ON leads(created_at);

-- Create a function to automatically update last_updated timestamp
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update last_updated
CREATE TRIGGER update_leads_last_updated 
    BEFORE UPDATE ON leads 
    FOR EACH ROW 
    EXECUTE FUNCTION update_last_updated_column();

-- Insert sample data (optional - for testing)
INSERT INTO leads (
    company, 
    contact_name, 
    contact_role, 
    meeting_status, 
    meeting_date, 
    date_booked, 
    phone_number, 
    url, 
    rep
) VALUES 
    ('Advanced Dental of Wallingford', 'Ryan Ku', 'Dentist', 'cancelled', '2025-05-28', '2025-05-19', '(203) 269-4730', 'https://advanceddentalwallingford.com', ''),
    ('Michael K. Hwang, DMD, LLC', 'Michael K. Hwang', 'Dentist', 'scheduled', '2025-06-09', '2025-05-20', '(860) 667-2600', 'https://mkhwangdmd.com', 'John Smith'),
    ('Smile Design Boston', 'Dr. Andre Hashem', 'Dentist', 'scheduled', '2025-08-13', '2025-06-01', '(617) 267-7777', 'https://smiledesignboston.com', 'Sarah Johnson'),
    ('Coletti Family Dentistry', 'Dr. Coletti', 'Dentist', 'scheduled', NULL, '2025-07-15', '(401) 943-0000', 'https://colettifamilydentistry.com', 'Mike Davis'),
    ('Biddeford Saco Orthodontics', 'Dr. Smith', 'Orthodontist', 'scheduled', '2025-09-20', '2025-07-20', '(207) 283-1100', 'https://biddefordsacortho.com', 'Lisa Wilson');

-- Create RLS (Row Level Security) policies
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read all leads
CREATE POLICY "Users can view all leads" ON leads
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for authenticated users to insert leads
CREATE POLICY "Users can insert leads" ON leads
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy for authenticated users to update leads
CREATE POLICY "Users can update leads" ON leads
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy for authenticated users to delete leads
CREATE POLICY "Users can delete leads" ON leads
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create a view for easier querying
CREATE VIEW leads_summary AS
SELECT 
    id,
    company,
    contact_name,
    contact_role,
    meeting_status,
    meeting_date,
    date_booked,
    phone_number,
    url,
    rep,
    last_updated,
    created_at,
    CASE 
        WHEN meeting_date IS NULL THEN 'No meeting scheduled'
        WHEN meeting_date < CURRENT_DATE THEN 'Meeting overdue'
        WHEN meeting_date = CURRENT_DATE THEN 'Meeting today'
        ELSE 'Meeting scheduled'
    END as meeting_status_detail
FROM leads
ORDER BY created_at DESC;

-- Grant necessary permissions
GRANT ALL ON leads TO authenticated;
GRANT ALL ON leads_summary TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
