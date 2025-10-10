# Multi-Tenant Database Structure Refactoring

## Overview

Transform the database from duplicating lead records per organization to a normalized structure where:

- **businesses** table holds shared business data (one row per real-world business)
- **lead_assignments** table tracks org-specific relationships with businesses
- Separate tables for **lead_notes**, **tasks**, **call_logs**, **meetings**, **reminders** all scoped by organization

## Phase 1: Database Schema Creation

### 1.1 Create New Tables

Create SQL migration file: `supabase-multi-tenant-migration.sql`

**Core tables to create:**

- `businesses` - shared business entities with phone_norm (unique, indexed)
- `lead_assignments` - org-specific status tracking with composite indexes on (organization_id, business_id)
- `lead_notes` - org-scoped notes with indexes
- `tasks` - org-scoped task management
- `call_logs` - org-scoped call tracking
- `meetings` - org-scoped meeting records
- `reminders` - org-scoped reminder/notification system

**Key indexes needed:**

- `businesses.phone_norm` (unique for duplicate prevention)
- `lead_assignments(organization_id, business_id)` (composite for fast org queries)
- `lead_assignments(business_id)` for lookups
- All activity tables need `(organization_id, business_id)` composite indexes
- `reminders(organization_id, assigned_to_user_id, status)` for user reminder lists
- `reminders(reminder_datetime, status)` for N8N scheduled queries
- `reminders(business_id, status)` for lead detail view

#### Reminders Table Schema

```sql
CREATE TABLE reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    assigned_to_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    -- Reminder details
    reminder_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    reminder_text TEXT NOT NULL,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'dismissed', 'snoozed')),
    
    -- Notification preferences (for future multi-channel support)
    notification_channels TEXT[] DEFAULT ARRAY['in_app'],
    
    -- Snooze functionality
    snoozed_until TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    sent_at TIMESTAMP WITH TIME ZONE,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for efficient queries
CREATE INDEX idx_reminders_org_user_status ON reminders(organization_id, assigned_to_user_id, status);
CREATE INDEX idx_reminders_datetime_status ON reminders(reminder_datetime, status) WHERE status = 'pending';
CREATE INDEX idx_reminders_business_status ON reminders(business_id, status);
CREATE INDEX idx_reminders_snoozed ON reminders(snoozed_until) WHERE status = 'snoozed';
```

**Reminders Design Decisions:**

- **Assignment**: Can be assigned to any user in the organization (flexible delegation)
- **Notification Channels**: Array field for future email/SMS support, initially in-app only
- **Recurrence**: One-time reminders only (simpler implementation)
- **Snooze**: Built-in with `snoozed_until` field and preset durations (15min, 1hr, 1day, 1week)
- **Visibility**: Users can see reminders on leads they have access to (follows lead_assignment access patterns)

### 1.2 Create RLS Policies

All org-scoped tables need RLS policies:

- SELECT: WHERE organization_id IN (user's org)
- INSERT/UPDATE/DELETE: Same org check
- `businesses` table: Read-only access for authenticated users

**Reminders RLS Policies:**

```sql
-- Users can view reminders in their organization
CREATE POLICY "Users can view reminders in their org" ON reminders
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- Users can create reminders in their organization
CREATE POLICY "Users can create reminders in their org" ON reminders
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM user_profiles 
            WHERE id = auth.uid()
        )
        AND created_by_user_id = auth.uid()
    );

-- Users can update their assigned reminders or reminders they created
CREATE POLICY "Users can update their reminders" ON reminders
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_profiles 
            WHERE id = auth.uid()
        )
        AND (assigned_to_user_id = auth.uid() OR created_by_user_id = auth.uid())
    );

-- Users can delete reminders they created
CREATE POLICY "Users can delete reminders they created" ON reminders
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_profiles 
            WHERE id = auth.uid()
        )
        AND created_by_user_id = auth.uid()
    );
```

### 1.3 Create Helper Functions

- Phone normalization function: `normalize_phone(text) -> text` (strips non-digits)
- Trigger to auto-populate `phone_norm` when inserting/updating businesses
- `get_or_create_business(phone, company_name, ...) -> business_id` for N8N workflows
- Trigger to auto-update `updated_at` timestamp on reminders

```sql
-- Trigger for reminders updated_at
CREATE TRIGGER update_reminders_updated_at 
    BEFORE UPDATE ON reminders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

## Phase 2: Data Migration

### 2.1 Migrate cold_leads → businesses + lead_assignments

Migration strategy:

1. Extract unique businesses from `cold_leads` using phone_norm as deduplication key
2. Insert into `businesses` table (one row per unique phone)
3. For each cold_leads record, create corresponding `lead_assignment` with status='cold'
4. Preserve organization_id from cold_leads records

### 2.2 Migrate engaged_leads/leads → businesses + lead_assignments + meetings

1. Extract unique businesses (check against existing businesses by phone)
2. Insert new businesses not already in table
3. Create `lead_assignments` with status='booked' or 'engaged'
4. Migrate meeting data to `meetings` table
5. Handle cases where cold_lead was converted to engaged (update assignment, don't duplicate business)

### 2.3 Verification Queries

- Count checks: original records = new lead_assignments
- Duplicate check: No duplicate phone_norm in businesses
- Foreign key integrity checks

## Phase 3: TypeScript Interface Updates

### 3.1 Create New Type Definitions

File: `src/types/database.ts`

```typescript
interface Business {
  id: string
  company_name: string
  phone_number: string
  phone_norm: string
  website: string | null
  address: string | null
  city: string | null
  state: string | null
  owner_name: string | null
  practice_type: string | null
  latitude: number | null
  longitude: number | null
  created_at: string
  updated_at: string
}

interface LeadAssignment {
  id: string
  business_id: string
  organization_id: string
  assigned_to_user_id: string | null
  status: 'cold' | 'engaged' | 'booked' | 'closed_won' | 'closed_lost' | 'do_not_call'
  last_contacted_at: string | null
  next_follow_up_date: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  // Joined fields
  business?: Business
}

interface LeadNote {
  id: string
  business_id: string
  organization_id: string
  user_id: string
  note_text: string
  created_at: string
}

interface Task {
  id: string
  business_id: string
  organization_id: string
  assigned_to_user_id: string
  created_by_user_id: string
  title: string
  description: string | null
  due_date: string | null
  status: string
  created_at: string
}

interface CallLog {
  id: string
  business_id: string
  organization_id: string
  user_id: string
  call_status: string
  call_duration: number | null
  call_recording_url: string | null
  call_date: string
  created_at: string
}

interface Meeting {
  id: string
  business_id: string
  organization_id: string
  booked_by_user_id: string
  meeting_date: string
  booked_with: string | null
  meeting_status: string
  created_at: string
}

interface Reminder {
  id: string
  business_id: string
  organization_id: string
  created_by_user_id: string
  assigned_to_user_id: string
  reminder_datetime: string
  reminder_text: string
  status: 'pending' | 'sent' | 'dismissed' | 'snoozed'
  notification_channels: string[]
  snoozed_until: string | null
  sent_at: string | null
  dismissed_at: string | null
  created_at: string
  updated_at: string
  // Joined fields
  business?: Business
  created_by_user?: UserProfile
  assigned_to_user?: UserProfile
}

interface UserProfile {
  id: string
  email: string
  full_name: string
  organization_id: string
  role: string
  avatar_url: string | null
  phone: string | null
  created_at: string
  updated_at: string
}
```

### 3.2 Update Existing Component Interfaces

Update `ColdLead` and `Lead` interfaces in:

- `src/components/crm/cold-leads-table.tsx`
- `src/components/crm/leads-table.tsx`

To work with joined data from `lead_assignments + businesses`

## Phase 4: Update Data Access Layer

### 4.1 Create New Supabase Utilities

File: `src/lib/supabase-businesses.ts`

- `getBusinessByPhone(phoneNorm): Promise<Business | null>`
- `createBusiness(data): Promise<Business>`
- `updateBusiness(id, data): Promise<Business>`
- `getOrCreateBusiness(phone, data): Promise<Business>` - for N8N workflows

File: `src/lib/supabase-lead-assignments.ts`

- `getLeadAssignments(orgId, filters): Promise<LeadAssignment[]>` with business JOIN
- `createLeadAssignment(data): Promise<LeadAssignment>`
- `updateLeadAssignment(id, data): Promise<LeadAssignment>`
- `softDeleteLeadAssignment(id): Promise<void>` - sets deleted_at
- `getLeadAssignmentByBusinessAndOrg(businessId, orgId): Promise<LeadAssignment | null>`

File: `src/lib/supabase-activities.ts`

- CRUD for lead_notes, tasks, call_logs, meetings
- All scoped by organization_id

File: `src/lib/supabase-reminders.ts`

- `getReminders(orgId, userId, filters): Promise<Reminder[]>` - get user's reminders with business JOIN
- `getRemindersByBusiness(businessId, orgId): Promise<Reminder[]>` - get reminders for a lead
- `createReminder(data): Promise<Reminder>` - create new reminder
- `updateReminder(id, data): Promise<Reminder>` - update reminder
- `snoozeReminder(id, duration: '15min' | '1hour' | '1day' | '1week'): Promise<Reminder>` - snooze with preset durations
- `dismissReminder(id): Promise<Reminder>` - mark as dismissed
- `deleteReminder(id): Promise<void>` - delete reminder
- `getPendingReminders(): Promise<Reminder[]>` - for N8N workflow (query for sending)

```typescript
// Example snooze implementation
export async function snoozeReminder(
  id: string, 
  duration: '15min' | '1hour' | '1day' | '1week'
): Promise<Reminder> {
  const now = new Date()
  let snoozedUntil: Date
  
  switch (duration) {
    case '15min':
      snoozedUntil = new Date(now.getTime() + 15 * 60 * 1000)
      break
    case '1hour':
      snoozedUntil = new Date(now.getTime() + 60 * 60 * 1000)
      break
    case '1day':
      snoozedUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      break
    case '1week':
      snoozedUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      break
  }
  
  const { data, error } = await supabase
    .from('reminders')
    .update({
      status: 'snoozed',
      snoozed_until: snoozedUntil.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
    
  if (error) throw error
  return data
}
```

### 4.2 Update Existing Hooks

**File: `src/hooks/use-cold-leads.ts`**

- Query `lead_assignments` joined with `businesses` WHERE status='cold'
- Update filters to work with new schema
- Update pagination to work with joined queries

**File: `src/hooks/use-leads.ts`**

- Query `lead_assignments` joined with `businesses` WHERE status IN ('engaged', 'booked')
- Join with `meetings` table for meeting details
- Update transformation logic

**Create new hooks:**

- `src/hooks/use-lead-notes.ts` - fetch notes for a business
- `src/hooks/use-lead-activities.ts` - fetch all activities (notes, tasks, calls, meetings)
- `src/hooks/use-reminders.ts` - fetch and manage reminders

**File: `src/hooks/use-reminders.ts`**

```typescript
import { useState, useEffect } from 'react'
import { Reminder } from '@/types/database'
import { useAuth } from '@/components/providers/auth-provider'
import { 
  getReminders, 
  getRemindersByBusiness,
  createReminder,
  updateReminder,
  snoozeReminder,
  dismissReminder,
  deleteReminder
} from '@/lib/supabase-reminders'

interface UseRemindersOptions {
  businessId?: string  // If provided, fetch reminders for specific business
  userId?: string      // If provided, fetch reminders for specific user
  includeCompleted?: boolean
}

export function useReminders(options: UseRemindersOptions = {}) {
  const { user } = useAuth()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)

  // Fetch user's organization
  useEffect(() => {
    // ... fetch organization logic similar to other hooks
  }, [user])

  // Fetch reminders
  const fetchReminders = async () => {
    if (!organizationId) return
    
    try {
      setLoading(true)
      setError(null)
      
      let data: Reminder[]
      
      if (options.businessId) {
        // Get reminders for specific business
        data = await getRemindersByBusiness(options.businessId, organizationId)
      } else {
        // Get reminders for user
        const userId = options.userId || user?.id
        if (!userId) throw new Error('User ID required')
        
        data = await getReminders(organizationId, userId, {
          includeCompleted: options.includeCompleted || false
        })
      }
      
      setReminders(data)
    } catch (err) {
      console.error('Error fetching reminders:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch reminders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (organizationId) {
      fetchReminders()
    }
  }, [organizationId, options.businessId, options.userId])

  const refresh = () => fetchReminders()

  return {
    reminders,
    loading,
    error,
    refresh,
    // Helper functions
    createReminder: async (data: Partial<Reminder>) => {
      const reminder = await createReminder(data)
      await refresh()
      return reminder
    },
    updateReminder: async (id: string, data: Partial<Reminder>) => {
      const reminder = await updateReminder(id, data)
      await refresh()
      return reminder
    },
    snoozeReminder: async (id: string, duration: '15min' | '1hour' | '1day' | '1week') => {
      const reminder = await snoozeReminder(id, duration)
      await refresh()
      return reminder
    },
    dismissReminder: async (id: string) => {
      const reminder = await dismissReminder(id)
      await refresh()
      return reminder
    },
    deleteReminder: async (id: string) => {
      await deleteReminder(id)
      await refresh()
    }
  }
}
```

## Phase 5: Update UI Components

### 5.1 Update Tables

**File: `src/components/crm/cold-leads-table.tsx`**

- Update to display joined business + lead_assignment data
- Ensure bulk delete uses soft delete on lead_assignments

**File: `src/components/crm/leads-table.tsx`**

- Update to work with new joined queries
- Display meeting info from meetings table

### 5.2 Update Detail Views

**Files:**

- `src/components/crm/lead-details.tsx`
- `src/components/crm/lead-details-flexible.tsx`

**Changes:**

- Update save operations to update both `businesses` and `lead_assignments`
- Add notes section that queries `lead_notes` table
- Show tasks from `tasks` table
- Show call history from `call_logs` table
- Show meetings from `meetings` table
- **Add reminders section** with create/view/manage functionality

**Reminder UI Components to Create:**

File: `src/components/crm/reminder-form.tsx` - Form to create/edit reminders with:
- DateTime picker for reminder_datetime
- Textarea for reminder_text
- User dropdown to assign reminder (defaults to current user)
- Save/Cancel actions

File: `src/components/crm/reminder-list.tsx` - Display list of reminders with:
- Grouped by status (upcoming, snoozed, past due)
- Shows relative time ("in 2 hours", "5 minutes ago")
- Action buttons: Snooze, Dismiss, Edit, Delete
- Snooze dropdown with preset durations (15min, 1hr, 1day, 1week)

File: `src/components/crm/reminder-badge.tsx` - Badge to show reminder count:
- Display count of pending reminders for current user
- Click to open reminders modal/drawer
- Real-time updates (optional: use Supabase realtime subscriptions)

### 5.3 Update CRUD Operations

**File: `src/lib/supabase-crud-utils.ts`**

- Update to work with new table structure
- Ensure creates go to correct tables
- Handle business lookup/creation before assignment creation

## Phase 6: Update N8N Workflow Integration

### 6.1 Update Lead Generation Workflow

**Changes needed in N8N:**

1. Call `get_or_create_business()` function with phone + scraped data
2. Check if `lead_assignment` exists for (business_id, org_id)
3. If not exists: Create lead_assignment with status='cold'
4. If exists and deleted_at IS NOT NULL: Don't re-add (respects user's disqualification)

### 6.2 Create Reminder Notification Workflow

**New N8N Workflow: Send Reminders**

**Trigger:** Schedule (runs every 5 minutes)

**Flow:**
1. **Query Pending Reminders** - Execute SQL:
   ```sql
   SELECT r.*, 
          b.company_name, 
          b.phone_number,
          u.email as user_email, 
          u.full_name as user_name,
          creator.full_name as created_by_name
   FROM reminders r
   JOIN businesses b ON r.business_id = b.id
   JOIN user_profiles u ON r.assigned_to_user_id = u.id
   JOIN user_profiles creator ON r.created_by_user_id = creator.id
   WHERE r.status = 'pending'
     AND r.reminder_datetime <= NOW()
     AND (r.snoozed_until IS NULL OR r.snoozed_until <= NOW())
   ORDER BY r.reminder_datetime ASC
   LIMIT 100
   ```

2. **For Each Reminder:**
   - Send email notification (if 'email' in notification_channels)
   - Send in-app notification (create notification record)
   - Send SMS (if 'sms' in notification_channels and user has phone)

3. **Update Reminder Status:**
   ```sql
   UPDATE reminders 
   SET status = 'sent', 
       sent_at = NOW(),
       updated_at = NOW()
   WHERE id = $reminder_id
   ```

4. **Error Handling:**
   - Log failed notifications
   - Retry logic for transient failures
   - Admin alerts for repeated failures

**Notification Email Template:**
```
Subject: Reminder: [Company Name]

Hi [User Name],

You have a reminder for [Company Name]:

[Reminder Text]

Originally scheduled for: [Reminder DateTime]
Created by: [Created By Name]

View in CRM: [Link to Lead Details]

---
Door2Door CRM
```

### 6.3 Update Webhook Handlers

**File: `src/lib/webhook-api.ts`** (if exists)

- Update any webhooks that create/update leads to use new structure

## Phase 7: Testing & Verification

### 7.1 Data Integrity Checks

- Verify no duplicate businesses (unique phone_norm constraint)
- Verify all lead_assignments reference valid businesses
- Verify organization_id exists on all org-scoped tables
- Count verification: old records = new records
- Verify reminders reference valid businesses and users

### 7.2 UI Testing

- Cold leads page loads correctly
- Engaged leads page loads correctly
- Lead details can be edited
- Notes can be added/viewed (org-scoped)
- Filters work with new structure
- Pagination works
- **Reminders can be created from lead details**
- **Reminders list displays correctly with proper grouping**
- **Snooze functionality works with all durations**
- **Dismiss/delete reminders work**
- **Past due reminders are highlighted**

### 7.3 Multi-Tenant Verification

- Create second test organization
- Verify Org A cannot see Org B's lead_assignments
- Verify same business can have different statuses per org
- Verify notes are private per org
- **Verify reminders are org-scoped (Org A can't see Org B's reminders)**
- **Verify users can only assign reminders to users in their org**

### 7.4 N8N Reminder Workflow Testing

- Create test reminder with datetime in near future (2-3 minutes)
- Verify N8N workflow picks it up and sends notification
- Verify reminder status updates to 'sent'
- Test snoozed reminders aren't sent until snoozed_until passes
- Test dismissed reminders aren't sent
- Verify email notification content is correct

## Phase 8: Cleanup & Documentation

### 8.1 Archive Old Tables

Once verified working:

- Rename `cold_leads` to `cold_leads_archive`
- Rename `engaged_leads` to `engaged_leads_archive` (or `leads` → `leads_archive`)
- Keep for 30 days for rollback capability

### 8.2 Update Documentation

Create file: `MULTI_TENANT_ARCHITECTURE.md`

- Document new table structure
- Document migration completed date
- Document N8N integration points
- Document RLS policies
- **Document reminders system and N8N workflow setup**
- **Document reminder notification channels and how to add new ones**

### 8.3 Update Schema Files

- Update or replace existing schema SQL files
- Add comment headers indicating deprecation of old structure

## Critical Considerations

**Phone Normalization:**

- Ensure consistent normalization (strip all non-digits)
- Handle international format considerations
- Create index on normalized phone for performance

**Soft Deletes:**

- Maintain `deleted_at` on lead_assignments (not businesses)
- Filter `WHERE deleted_at IS NULL` in all queries
- N8N should respect deleted_at to not re-add disqualified leads

**Performance:**

- Composite indexes on (organization_id, business_id) critical for performance
- Consider materialized view for frequently accessed joined queries
- Monitor query performance on large datasets
- **Reminders query optimization: Index on (reminder_datetime, status) critical for N8N workflow**

**Data Privacy:**

- RLS policies enforce org boundaries
- Test policies thoroughly
- Audit all queries to ensure organization_id filters
- **Reminders contain sensitive business info - ensure proper RLS enforcement**

**Reminders Specific Considerations:**

- **Timezone Handling**: Store all datetimes in UTC, display in user's local timezone
- **Past Due Handling**: Decide if past due reminders should still send or auto-dismiss
- **Notification Delivery**: Ensure N8N workflow has proper error handling and retry logic
- **User Preferences**: Consider future enhancement for notification preferences per user
- **Bulk Operations**: Consider allowing batch reminder creation (e.g., "remind me about all cold leads in 3 days")
- **Reminder Templates**: Consider pre-defined reminder templates for common scenarios

## Implementation Todos

- [ ] Create new database schema with businesses, lead_assignments, and activity tables with proper indexes and RLS
- [ ] Add reminders table with indexes and RLS policies
- [ ] Migrate existing data from cold_leads and engaged_leads into new multi-tenant structure
- [ ] Create TypeScript interfaces for new database tables (including Reminder interface)
- [ ] Create Supabase utility functions for businesses, lead_assignments, and activities
- [ ] Create Supabase reminders utility functions with snooze/dismiss/delete
- [ ] Update existing hooks and create new ones to work with new table structure
- [ ] Create use-reminders hook for reminder management
- [ ] Update UI components (tables, detail views) to work with new joined queries
- [ ] Create reminder UI components (ReminderForm, ReminderList, ReminderBadge)
- [ ] Integrate reminders into lead detail views
- [ ] Document N8N workflow changes for new get_or_create_business pattern
- [ ] Create N8N reminder notification workflow with email/in-app support
- [ ] Configure N8N schedule trigger (every 5 minutes)
- [ ] Set up email templates for reminder notifications
- [ ] Test multi-tenant isolation, data integrity, and UI functionality
- [ ] Test reminder creation, snooze, dismiss, and delete functionality
- [ ] Test N8N reminder workflow end-to-end
- [ ] Verify timezone handling for reminders
- [ ] Archive old tables, create architecture documentation
- [ ] Document reminders system in MULTI_TENANT_ARCHITECTURE.md


