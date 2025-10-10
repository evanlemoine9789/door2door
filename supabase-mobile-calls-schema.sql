-- Mobile Call Logs Table Schema
-- This table stores call logs from the mobile dialer

CREATE TABLE mobile_call_logs (
  id SERIAL PRIMARY KEY,
  cold_lead_id UUID REFERENCES cold_leads(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  call_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  disposition VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_mobile_calls_lead ON mobile_call_logs(cold_lead_id);
CREATE INDEX idx_mobile_calls_timestamp ON mobile_call_logs(call_timestamp);
CREATE INDEX idx_mobile_calls_disposition ON mobile_call_logs(disposition);

-- Enable Row Level Security
ALTER TABLE mobile_call_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read their own call logs
CREATE POLICY "Users can view call logs" ON mobile_call_logs
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to insert call logs
CREATE POLICY "Users can insert call logs" ON mobile_call_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to update their call logs
CREATE POLICY "Users can update call logs" ON mobile_call_logs
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_mobile_call_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_mobile_call_logs_updated_at
    BEFORE UPDATE ON mobile_call_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_mobile_call_logs_updated_at();

-- Disposition values reference (for documentation):
-- - Booked
-- - Not Booked
-- - No Connect
-- - Email
-- - Do Not Call
-- - Clear Status

