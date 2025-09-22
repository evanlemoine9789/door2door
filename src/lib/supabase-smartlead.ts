import { supabase } from './supabase'

export interface SmartleadTotals {
  sent: number
  replies: number
  positive: number
  ratePct: string
}

export async function fetchSmartleadTotals(params: { start: string; end: string }): Promise<SmartleadTotals> {
  const { start, end } = params
  const { data, error } = await supabase
    .from('smartlead_daily_metrics')
    .select('emails_sent,replies,positive_replies')
    .gte('metric_date', start)
    .lte('metric_date', end)

  if (error) throw error

  const agg = (data ?? []).reduce(
    (a, r) => ({
      sent: a.sent + (r.emails_sent ?? 0),
      replies: a.replies + (r.replies ?? 0),
      positive: a.positive + (r.positive_replies ?? 0),
    }),
    { sent: 0, replies: 0, positive: 0 }
  )

  const rate =
    agg.replies > 0 ? Math.round((agg.positive / agg.replies) * 1000) / 10 : 0 // one decimal
  return { ...agg, ratePct: `${rate}%` }
}

export interface SmartleadChartData {
  date: string
  emails: number
  replies: number
  positives: number
}

export async function fetchSmartleadChartData(params: { start: string; end: string }): Promise<SmartleadChartData[]> {
  const { start, end } = params
  const { data, error } = await supabase
    .from('smartlead_daily_metrics')
    .select('metric_date, emails_sent, replies, positive_replies')
    .gte('metric_date', start)
    .lte('metric_date', end)
    .order('metric_date', { ascending: true })

  if (error) throw error

  return (data ?? []).map(item => ({
    date: item.metric_date,
    emails: item.emails_sent ?? 0,
    replies: item.replies ?? 0,
    positives: item.positive_replies ?? 0,
  }))
}

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
