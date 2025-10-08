# n8n Lead Generation - Soft Delete Integration Guide

## Overview

The `cold_leads` table now uses **soft deletes**. When you delete a lead from the frontend, it's not actually removed from the database—it's just marked with a `deleted_at` timestamp and hidden from the UI.

This prevents your n8n lead generation workflow from re-adding leads you've already disqualified.

---

## Why Soft Deletes?

### The Problem
Before soft deletes:
1. Generate leads for "Dallas, TX"
2. Cold call through leads, delete unqualified ones
3. Leads are **permanently removed** from database
4. Run lead generation again for "Dallas, TX"
5. **Same disqualified leads get added back** 😤

### The Solution
With soft deletes:
1. Generate leads for "Dallas, TX"
2. Cold call through leads, "delete" (mark as deleted) unqualified ones
3. Leads stay in database with `deleted_at` timestamp set
4. Frontend **hides** them from your view
5. Run lead generation again for "Dallas, TX"
6. n8n checks ALL leads (including deleted) → **Skips duplicates** ✅

---

## Database Changes

### New Column
- **Column**: `deleted_at` (TIMESTAMP WITH TIME ZONE)
- **Default**: `NULL` (means active/visible)
- **When "deleted"**: Set to current timestamp
- **Frontend**: Only shows leads where `deleted_at IS NULL`

### Migration
If you haven't already run it, execute this SQL in Supabase:

```sql
-- Run the migration
-- File: supabase-cold-leads-soft-delete.sql
```

---

## How to Update Your n8n Workflow

### Current Workflow (Needs Update)

Your current workflow probably checks for duplicates like this:

```sql
-- ❌ OLD WAY - Only checks visible leads
SELECT * FROM cold_leads 
WHERE phone = {{ $json.phone }}
AND deleted_at IS NULL
```

This is wrong because it will re-add deleted leads!

### Updated Workflow (Correct)

Update your duplicate check to include ALL leads:

```sql
-- ✅ NEW WAY - Checks all leads (including deleted)
SELECT * FROM cold_leads 
WHERE phone = {{ $json.phone }}
-- Note: NO filter on deleted_at
```

### Complete n8n Workflow Steps

Here's how to structure your lead generation workflow:

#### Step 1: Extract Leads from Source
Use your existing lead scraping/enrichment nodes.

#### Step 2: Check for Existing Leads (INCLUDING DELETED)
**Supabase Node** - Query for duplicates:

```sql
SELECT id, phone, deleted_at 
FROM cold_leads 
WHERE phone = {{ $json.phone }}
LIMIT 1
```

**Important**: This query checks ALL leads, not just active ones.

#### Step 3: Filter Out Duplicates
**Filter Node** - Only continue if lead doesn't exist:

```json
{
  "conditions": {
    "boolean": [
      {
        "value1": "{{ $('Check Existing').item.json.id }}",
        "operation": "isEmpty"
      }
    ]
  }
}
```

#### Step 4: Insert New Lead
**Supabase Node** - Insert only if not duplicate:

```sql
INSERT INTO cold_leads (
  company_name,
  owner_name,
  phone,
  practice_type,
  address,
  city,
  state,
  website,
  created_at,
  updated_at
) VALUES (
  {{ $json.company_name }},
  {{ $json.owner_name }},
  {{ $json.phone }},
  {{ $json.practice_type }},
  {{ $json.address }},
  {{ $json.city }},
  {{ $json.state }},
  {{ $json.website }},
  NOW(),
  NOW()
)
ON CONFLICT (phone) DO NOTHING
RETURNING *;
```

### Alternative: Bulk Duplicate Check

If processing many leads at once, do a bulk check:

#### Step 1: Get All Existing Phones for the Area

```sql
-- Get all existing phones in the target area (including deleted)
SELECT phone 
FROM cold_leads 
WHERE city = {{ $json.city }} 
AND state = {{ $json.state }}
```

#### Step 2: Store in Variable
Use **Set Node** to store as array.

#### Step 3: Filter Node
Only process leads whose phone isn't in the existing array.

#### Step 4: Bulk Insert
Insert remaining leads.

---

## Testing Your Workflow

### Test Scenario

1. **Generate leads** for a specific city (e.g., "Austin, TX")
2. **Verify** leads appear in your cold leads list
3. **Delete some leads** from the UI (they disappear)
4. **Check Supabase** directly - deleted leads should have `deleted_at` set
5. **Run workflow again** for "Austin, TX" with same lead data
6. **Verify** deleted leads are NOT re-added
7. **New leads** (if any) should be added normally

### Test Queries

Check if soft delete is working:

```sql
-- See all leads including deleted
SELECT company_name, phone, deleted_at 
FROM cold_leads 
WHERE city = 'Austin' AND state = 'TX'
ORDER BY created_at DESC;

-- Count active vs deleted
SELECT 
  COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_leads,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_leads
FROM cold_leads;
```

---

## Frontend Behavior

### What Users See
- ✅ Only active leads (`deleted_at IS NULL`)
- ❌ Deleted leads are hidden
- 🗑️ "Delete" button marks as deleted (soft delete)

### Confirmation Message
When deleting a cold lead, users see:
> "Mark [Company Name] as disqualified? This will hide it from your list but keep it in the database to prevent duplicates."

This clarifies it's not a permanent deletion.

---

## Restoring Deleted Leads (If Needed)

If you accidentally deleted a lead, you can restore it:

```sql
-- Restore a specific lead
UPDATE cold_leads 
SET deleted_at = NULL 
WHERE id = 'lead-id-here';

-- Restore all leads deleted after a certain date
UPDATE cold_leads 
SET deleted_at = NULL 
WHERE deleted_at > '2025-10-01';
```

After restoring, the lead will reappear in the frontend.

---

## Performance Notes

### Indexes
The migration creates these indexes:
- `idx_cold_leads_deleted_at` - Partial index for fast filtering of active leads
- `idx_cold_leads_phone_all` - For duplicate checks
- `idx_cold_leads_company_phone` - For company+phone lookups

### Query Performance
- Filtering active leads: **Fast** (uses partial index)
- Checking duplicates: **Fast** (uses phone index)
- No performance degradation with deleted leads

---

## Troubleshooting

### Issue: Workflow keeps adding duplicate leads

**Cause**: Your duplicate check is filtering by `deleted_at IS NULL`

**Fix**: Remove the `deleted_at` filter from your duplicate check query:

```sql
-- ❌ Wrong
SELECT * FROM cold_leads 
WHERE phone = {{ $json.phone }}
AND deleted_at IS NULL

-- ✅ Correct  
SELECT * FROM cold_leads 
WHERE phone = {{ $json.phone }}
```

### Issue: I want to permanently delete old leads

**Solution**: Create a cleanup script/workflow:

```sql
-- Hard delete leads that were soft-deleted more than 6 months ago
DELETE FROM cold_leads 
WHERE deleted_at < NOW() - INTERVAL '6 months';
```

⚠️ **Warning**: This permanently removes data. Make sure you have backups.

### Issue: Need to see deleted leads

**Admin Query**:
```sql
-- View all deleted leads
SELECT 
  company_name,
  phone,
  city,
  state,
  deleted_at
FROM cold_leads 
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC;
```

---

## Summary

✅ **Frontend**: Only shows active leads  
✅ **Delete Action**: Sets `deleted_at` timestamp (soft delete)  
✅ **n8n Workflow**: Checks ALL leads to prevent duplicates  
✅ **Performance**: Maintained with proper indexes  
✅ **Reversible**: Deleted leads can be restored if needed  

Your workflow will now respect disqualified leads and won't waste your time re-adding them! 🎉

