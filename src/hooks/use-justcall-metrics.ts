import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

export type TimePeriod = 'today' | '7days' | '30days';

export interface JustCallMetrics {
  date: string;
  total_calls: number;
  booked_calls: number;
  conversion_rate: number;
}

export interface MetricsSummary {
  total_calls: number;
  total_booked_calls: number;
  average_conversion_rate: number;
  period: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useJustCallMetrics() {
  const [metrics, setMetrics] = useState<JustCallMetrics[]>([]);
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async (period: TimePeriod) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('justcall_daily_metrics')
        .select('date, total_calls, booked_calls')
        .order('date', { ascending: false });

      // Apply date filtering based on period
      const today = new Date();
      let startDate: Date;

      switch (period) {
        case 'today':
          startDate = today;
          break;
        case '7days':
          startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
          startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = today;
      }

      // Format dates for Supabase query using local date to avoid timezone issues
      const formatLocalDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const startDateStr = formatLocalDate(startDate);
      const endDateStr = formatLocalDate(today);

      if (period === 'today') {
        query = query.eq('date', startDateStr);
      } else {
        query = query.gte('date', startDateStr).lte('date', endDateStr);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        // Calculate conversion rates and format data
        const formattedMetrics: JustCallMetrics[] = data.map(item => ({
          date: item.date,
          total_calls: item.total_calls,
          booked_calls: item.booked_calls,
          conversion_rate: item.total_calls > 0 
            ? Math.round((item.booked_calls / item.total_calls) * 100) 
            : 0
        }));

        setMetrics(formattedMetrics);

        // Calculate summary statistics
        const totalCalls = data.reduce((sum, item) => sum + item.total_calls, 0);
        const totalBookedCalls = data.reduce((sum, item) => sum + item.booked_calls, 0);
        const avgConversionRate = totalCalls > 0 
          ? Math.round((totalBookedCalls / totalCalls) * 100) 
          : 0;

        const periodLabels = {
          today: 'Today',
          '7days': 'Last 7 Days',
          '30days': 'Last 30 Days'
        };

        setSummary({
          total_calls: totalCalls,
          total_booked_calls: totalBookedCalls,
          average_conversion_rate: avgConversionRate,
          period: periodLabels[period]
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  return {
    metrics,
    summary,
    loading,
    error,
    fetchMetrics
  };
}



