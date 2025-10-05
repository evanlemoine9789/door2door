import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables first
config({ path: '.env.local' })

// Create supabase client after env vars are loaded
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function main() {
  const { data, error } = await supabase.from('engaged_leads').select('meeting_status')
  if (error) throw error
  const set = Array.from(new Set((data ?? []).map(r => String(r.meeting_status)))).sort()
  console.log('MEETING_STATUS VALUES:', set)
}

main()
