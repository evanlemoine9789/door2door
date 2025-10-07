'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import { Calendar } from 'lucide-react';
import { useJustCallMetrics, TimePeriod } from '@/hooks/use-justcall-metrics';
import { ColdCallsAreaChart } from '@/components/charts/ColdCallsAreaChart';
import { EngagedLeadsMetrics } from '@/components/dashboard/engaged-leads-metrics';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CardAction,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";

export function JustCallMetrics() {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('today');
  const { metrics, summary, loading, error, fetchMetrics } = useJustCallMetrics();

  useEffect(() => {
    const getDateRange = (period: TimePeriod) => {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      
      switch (period) {
        case 'today':
          return { start: todayStr, end: todayStr };
        case '7days':
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(today.getDate() - 7);
          return { start: sevenDaysAgo.toISOString().slice(0, 10), end: todayStr };
        case '30days':
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(today.getDate() - 30);
          return { start: thirtyDaysAgo.toISOString().slice(0, 10), end: todayStr };
        default:
          return { start: todayStr, end: todayStr };
      }
    };

    // Fetch JustCall metrics only
    const fetchAllMetrics = async () => {
      try {
        await fetchMetrics(selectedPeriod);
      } catch (error) {
        console.error('Error fetching metrics:', error);
      }
    };

    fetchAllMetrics();
  }, [selectedPeriod, fetchMetrics]);

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period as TimePeriod);
  };

  if (error) {
    return (
      <Card className="bg-background border-border">
        <CardContent className="pt-6">
          <div className="text-destructive text-center">
            Error loading metrics: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center justify-end">
        <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-40 bg-background border-border text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background border-border">
            <SelectItem value="today" className="text-foreground hover:bg-accent">Today</SelectItem>
            <SelectItem value="7days" className="text-foreground hover:bg-accent">Last 7 Days</SelectItem>
            <SelectItem value="30days" className="text-foreground hover:bg-accent">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cold Call Metrics */}
      {summary && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-card-foreground">Cold Call</h2>
          <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-3 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs">
          <Card className="@container/card">
            <CardHeader>
              <CardDescription>Total Calls</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {summary.total_calls.toLocaleString()}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <IconTrendingUp />
                  +12.5%
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Trending up this month <IconTrendingUp className="size-4" />
              </div>
              <div className="text-muted-foreground">
                Calls for the last 6 months
              </div>
            </CardFooter>
          </Card>

          <Card className="@container/card">
            <CardHeader>
              <CardDescription>Booked Calls</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {summary.total_booked_calls.toLocaleString()}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <IconTrendingDown />
                  -20%
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Down 20% this period <IconTrendingDown className="size-4" />
              </div>
              <div className="text-muted-foreground">
                Conversion needs attention
              </div>
            </CardFooter>
          </Card>

          <Card className="@container/card">
            <CardHeader>
              <CardDescription>Conversion Rate</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {summary.average_conversion_rate}%
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <IconTrendingUp />
                  +12.5%
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Strong conversion rate <IconTrendingUp className="size-4" />
              </div>
              <div className="text-muted-foreground">Performance exceeds targets</div>
            </CardFooter>
          </Card>
          </div>
        </div>
      )}

      {/* Engaged Leads Metrics */}
      <EngagedLeadsMetrics />

      {/* Cold Calls Daily Trend Chart */}
      <ColdCallsAreaChart />

      {/* Detailed Metrics Table */}
      <Card className="bg-background border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Daily Breakdown - {summary?.period}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading metrics...</p>
            </div>
          ) : metrics.length > 0 ? (
            <ScrollArea className="h-[400px] w-full rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Date</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Total Calls</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Booked Calls</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Conversion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((metric, index) => (
                    <tr key={index} className="border-b border-border hover:bg-accent/50">
                      <td className="py-3 px-4 text-card-foreground">
                        {(() => {
                          // Parse date string to avoid timezone issues
                          const [year, month, day] = metric.date.split('-').map(Number);
                          const date = new Date(year, month - 1, day);
                          return date.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          });
                        })()}
                      </td>
                      <td className="py-3 px-4 text-card-foreground">{metric.total_calls}</td>
                      <td className="py-3 px-4 text-card-foreground">{metric.booked_calls}</td>
                      <td className="py-3 px-4">
                        <Badge 
                          variant="secondary" 
                          className={`${
                            metric.conversion_rate >= 30 ? 'bg-green-600 text-white' :
                            metric.conversion_rate >= 20 ? 'bg-yellow-600 text-white' :
                            'bg-red-600 text-white'
                          }`}
                        >
                          {metric.conversion_rate}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No metrics available for the selected period.</p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}



