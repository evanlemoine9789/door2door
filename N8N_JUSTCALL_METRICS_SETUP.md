# N8N JustCall Metrics Workflow Extension

This document explains how to extend your existing n8n workflow to pull daily JustCall metrics and store them in the new `justcall_daily_metrics` table.

## Current Workflow
You already have a workflow that runs daily and pulls booked calls from JustCall to add to the leads table in Supabase.

## New Workflow Extension

### 1. Add JustCall API Call Node
Add a new HTTP Request node to your existing workflow:

**Node Configuration:**
- **Method:** GET
- **URL:** `https://api.justcall.io/v2/calls`
- **Headers:**
  ```
  Authorization: Bearer YOUR_JUSTCALL_API_KEY
  Content-Type: application/json
  ```

**Query Parameters:**
- `start_date`: `{{ $today }}` (format: YYYY-MM-DD)
- `end_date`: `{{ $today }}` (format: YYYY-MM-DD)
- `limit`: 1000

### 2. Add Data Processing Node
Add a Function node to process the JustCall response:

```javascript
// Process JustCall API response
const calls = $input.all()[0].json.data || [];
const today = new Date().toISOString().split('T')[0];

// Count total calls
const totalCalls = calls.length;

// Count booked calls (calls with disposition 'Booked')
const bookedCalls = calls.filter(call => 
  call.disposition && call.disposition.toLowerCase() === 'booked'
).length;

// Return formatted data
return {
  date: today,
  total_calls: totalCalls,
  booked_calls: bookedCalls
};
```

### 3. Add Supabase Insert Node
Add a Supabase node to insert the metrics:

**Node Configuration:**
- **Operation:** Insert
- **Table:** `justcall_daily_metrics`
- **Data:** Use the output from the Function node

**Data Structure:**
```json
{
  "date": "{{ $json.date }}",
  "total_calls": "{{ $json.total_calls }}",
  "booked_calls": "{{ $json.booked_calls }}"
}
```

### 4. Add Error Handling
Add error handling nodes to catch and log any API failures.

## Workflow Schedule
- **Frequency:** Daily
- **Time:** Same time as your existing booked calls workflow
- **Timezone:** Your preferred timezone

## API Rate Limits
JustCall API has rate limits, so ensure your workflow runs during off-peak hours if you're making multiple calls.

## Testing
1. Test the workflow manually first
2. Verify data is inserted into the `justcall_daily_metrics` table
3. Check the dashboard displays the metrics correctly

## Environment Variables
Ensure these are set in your n8n environment:
- `JUSTCALL_API_KEY`: Your JustCall API key
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

## Troubleshooting
- Check n8n execution logs for API errors
- Verify Supabase table permissions
- Ensure date formats match expected format (YYYY-MM-DD)
- Check if JustCall API key has necessary permissions



