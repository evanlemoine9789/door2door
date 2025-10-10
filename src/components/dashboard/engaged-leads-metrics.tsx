'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IconTrendingDown, IconTrendingUp, IconCalendar } from "@tabler/icons-react";
import {
  CardAction,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { useEngagedLeadsMetrics } from '@/hooks/use-engaged-leads-metrics';
import { useIsMobile } from '@/hooks/use-mobile';

export function EngagedLeadsMetrics() {
  const { metrics, loading, error } = useEngagedLeadsMetrics();
  const isMobile = useIsMobile();

  if (error) {
    return (
      <Card className="bg-background border-border">
        <CardContent className="pt-6">
          <div className="text-destructive text-center">
            Error loading engaged leads metrics: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3 md:space-y-4">
        <h2 className="text-xl md:text-2xl font-bold text-card-foreground">Engaged Leads</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <Card className="@container/card">
            <CardContent className="pt-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2 mb-4"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
          <Card className="@container/card">
            <CardContent className="pt-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2 mb-4"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Calculate trend indicators (mock data for now - you can enhance this later)
  const upcomingTrend = metrics.upcomingMeetings > 0 ? 5.2 : 0;
  const meetingsPastTrend = metrics.meetingsPast > 0 ? 12.5 : 0;

  return (
    <div className="space-y-3 md:space-y-4">
      <h2 className="text-xl md:text-2xl font-bold text-card-foreground">Engaged Leads</h2>
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs">
        
        {/* Upcoming Meetings Card */}
        <Card className="@container/card">
          <CardHeader className="pb-3">
            <CardDescription className="text-sm">Upcoming Meetings</CardDescription>
            <CardTitle className="text-xl md:text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {metrics.upcomingMeetings.toLocaleString()}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="text-xs">
                {upcomingTrend >= 0 ? <IconTrendingUp className="h-3 w-3" /> : <IconTrendingDown className="h-3 w-3" />}
                {upcomingTrend >= 0 ? '+' : ''}{upcomingTrend}%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 text-xs md:text-sm pt-0">
            <div className="line-clamp-1 flex gap-2 font-medium">
              {upcomingTrend >= 0 ? 'Growing meeting pipeline' : 'Meeting pipeline declining'} 
              {upcomingTrend >= 0 ? <IconTrendingUp className="size-3 md:size-4" /> : <IconTrendingDown className="size-3 md:size-4" />}
            </div>
            <div className="text-muted-foreground">
              Meetings scheduled in the future
            </div>
          </CardFooter>
        </Card>

        {/* Meetings Past Card */}
        <Card className="@container/card">
          <CardHeader className="pb-3">
            <CardDescription className="text-sm">Meetings Past</CardDescription>
            <CardTitle className="text-xl md:text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {metrics.meetingsPast.toLocaleString()}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="text-xs">
                {meetingsPastTrend >= 0 ? <IconTrendingUp className="h-3 w-3" /> : <IconTrendingDown className="h-3 w-3" />}
                {meetingsPastTrend >= 0 ? '+' : ''}{meetingsPastTrend}%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 text-xs md:text-sm pt-0">
            <div className="line-clamp-1 flex gap-2 font-medium">
              {metrics.meetingsPast > 0 ? 'Active meeting history' : 'No past meetings'} 
              {meetingsPastTrend >= 0 ? <IconTrendingUp className="size-3 md:size-4" /> : <IconTrendingDown className="size-3 md:size-4" />}
            </div>
            <div className="text-muted-foreground">
              Meetings today or in the past
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
