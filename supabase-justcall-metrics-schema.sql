-- JustCall Daily Metrics Table Schema
-- This table stores daily call metrics from JustCall API

CREATE TABLE IF NOT EXISTS justcall_daily_metrics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    total_calls INTEGER NOT NULL DEFAULT 0,
    booked_calls INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on date for efficient queries
CREATE INDEX IF NOT EXISTS idx_justcall_metrics_date ON justcall_daily_metrics(date);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_justcall_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_justcall_metrics_updated_at
    BEFORE UPDATE ON justcall_daily_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_justcall_metrics_updated_at();

-- Insert some sample data for testing (you can remove this later)
INSERT INTO justcall_daily_metrics (date, total_calls, booked_calls) VALUES
    (CURRENT_DATE - INTERVAL '30 days', 45, 12),
    (CURRENT_DATE - INTERVAL '29 days', 52, 15),
    (CURRENT_DATE - INTERVAL '28 days', 38, 8),
    (CURRENT_DATE - INTERVAL '7 days', 67, 23),
    (CURRENT_DATE - INTERVAL '6 days', 58, 19),
    (CURRENT_DATE - INTERVAL '5 days', 72, 28),
    (CURRENT_DATE - INTERVAL '4 days', 65, 22),
    (CURRENT_DATE - INTERVAL '3 days', 81, 31),
    (CURRENT_DATE - INTERVAL '2 days', 74, 26),
    (CURRENT_DATE - INTERVAL '1 day', 69, 24),
    (CURRENT_DATE, 76, 29)
ON CONFLICT (date) DO NOTHING;
