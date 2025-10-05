import { supabase } from './supabase'

export interface JustCallChartData {
  date: string
  callsMade: number
  meetingsBooked: number
}

export async function fetchJustCallChartData(params: { start: string; end: string }): Promise<JustCallChartData[]> {
  const { start, end } = params
  const { data, error } = await supabase
    .from('justcall_daily_metrics')
    .select('date, total_calls, booked_calls')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true })

  if (error) throw error

  return (data ?? []).map(item => ({
    date: item.date,
    callsMade: item.total_calls ?? 0,
    meetingsBooked: item.booked_calls ?? 0,
  }))
}
