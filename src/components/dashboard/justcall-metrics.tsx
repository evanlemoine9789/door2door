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
import { useIsMobile } from '@/hooks/use-mobile';
import {
  CardAction,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";

export function JustCallMetrics() {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('today');
  const { metrics, summary, loading, error, fetchMetrics } = useJustCallMetrics();
  const isMobile = useIsMobile();

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
    <div className="space-y-3 md:space-y-4">
      {/* Period selector */}
      <div className="flex items-center justify-end">
        <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-32 md:w-40 h-9 md:h-10 bg-background border-border text-foreground">
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
        <div className="space-y-3 md:space-y-4">
          <h2 className="text-xl md:text-2xl font-bold text-card-foreground">Cold Call</h2>
          <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs">
          <Card className="@container/card">
            <CardHeader className="pb-3">
              <CardDescription className="text-sm">Total Calls</CardDescription>
              <CardTitle className="text-xl md:text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {summary.total_calls.toLocaleString()}
              </CardTitle>
              <CardAction>
                <Badge variant="outline" className="text-xs">
                  <IconTrendingUp className="h-3 w-3" />
                  +12.5%
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 text-xs md:text-sm pt-0">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Trending up this month <IconTrendingUp className="size-3 md:size-4" />
              </div>
              <div className="text-muted-foreground">
                Calls for the last 6 months
              </div>
            </CardFooter>
          </Card>

          <Card className="@container/card">
            <CardHeader className="pb-3">
              <CardDescription className="text-sm">Booked Calls</CardDescription>
              <CardTitle className="text-xl md:text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {summary.total_booked_calls.toLocaleString()}
              </CardTitle>
              <CardAction>
                <Badge variant="outline" className="text-xs">
                  <IconTrendingDown className="h-3 w-3" />
                  -20%
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 text-xs md:text-sm pt-0">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Down 20% this period <IconTrendingDown className="size-3 md:size-4" />
              </div>
              <div className="text-muted-foreground">
                Conversion needs attention
              </div>
            </CardFooter>
          </Card>

          <Card className="@container/card">
            <CardHeader className="pb-3">
              <CardDescription className="text-sm">Conversion Rate</CardDescription>
              <CardTitle className="text-xl md:text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {summary.average_conversion_rate}%
              </CardTitle>
              <CardAction>
                <Badge variant="outline" className="text-xs">
                  <IconTrendingUp className="h-3 w-3" />
                  +12.5%
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 text-xs md:text-sm pt-0">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Strong conversion rate <IconTrendingUp className="size-3 md:size-4" />
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
        <CardHeader className="pb-3">
          <CardTitle className="text-lg md:text-xl text-card-foreground flex items-center space-x-2">
            <Calendar className="h-4 w-4 md:h-5 md:w-5" />
            <span>Daily Breakdown - {summary?.period}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-6 md:py-8">
              <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2 text-sm">Loading metrics...</p>
            </div>
          ) : metrics.length > 0 ? (
            <ScrollArea className="h-[300px] md:h-[400px] w-full rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 md:py-3 px-2 md:px-4 text-muted-foreground font-medium text-sm">Date</th>
                    <th className="text-left py-2 md:py-3 px-2 md:px-4 text-muted-foreground font-medium text-sm">Total Calls</th>
                    <th className="text-left py-2 md:py-3 px-2 md:px-4 text-muted-foreground font-medium text-sm">Booked Calls</th>
                    <th className="text-left py-2 md:py-3 px-2 md:px-4 text-muted-foreground font-medium text-sm">Conversion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((metric, index) => (
                    <tr key={index} className="border-b border-border hover:bg-accent/50">
                      <td className="py-2 md:py-3 px-2 md:px-4 text-card-foreground text-sm">
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
                      <td className="py-2 md:py-3 px-2 md:px-4 text-card-foreground text-sm">{metric.total_calls}</td>
                      <td className="py-2 md:py-3 px-2 md:px-4 text-card-foreground text-sm">{metric.booked_calls}</td>
                      <td className="py-2 md:py-3 px-2 md:px-4">
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${
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
            <div className="text-center py-6 md:py-8">
              <p className="text-muted-foreground text-sm">No metrics available for the selected period.</p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}



