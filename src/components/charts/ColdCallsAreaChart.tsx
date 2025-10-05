"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { fetchJustCallChartData, JustCallChartData } from "@/lib/supabase-smartlead"

const chartConfig = {
  callsMade: { label: "Calls Made", color: "#3b82f6" },
  meetingsBooked: { label: "Meetings Booked", color: "#22c55e" },
} satisfies ChartConfig

export function ColdCallsAreaChart() {
  const [timeRange, setTimeRange] = React.useState<"90d" | "30d" | "7d">("90d")
  const [chartData, setChartData] = React.useState<JustCallChartData[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const today = new Date()
        const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90
        const start = new Date(today)
        start.setDate(start.getDate() - days + 1)
        
        const startStr = start.toISOString().slice(0, 10)
        const endStr = today.toISOString().slice(0, 10)
        
        const data = await fetchJustCallChartData({ start: startStr, end: endStr })
        setChartData(data)
      } catch (error) {
        console.error('Error fetching cold calls chart data:', error)
        setChartData([])
      } finally {
        setLoading(false)
      }
    }

    // Add a small delay to prevent excessive API calls
    const timeoutId = setTimeout(fetchData, 100)
    return () => clearTimeout(timeoutId)
  }, [timeRange])

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Cold Calls — Daily Trend</CardTitle>
          <CardDescription>Calls made and meetings booked</CardDescription>
        </div>
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
          <SelectTrigger className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex" aria-label="Select a range">
            <SelectValue placeholder="Last 3 months" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d" className="rounded-lg">Last 3 months</SelectItem>
            <SelectItem value="30d" className="rounded-lg">Last 30 days</SelectItem>
            <SelectItem value="7d"  className="rounded-lg">Last 7 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {loading ? (
          <div className="flex items-center justify-center h-[250px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
            <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillCallsMade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="fillMeetingsBooked" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value: string) => {
                // Parse date string to avoid timezone issues
                const [year, month, day] = value.split('-').map(Number);
                const date = new Date(year, month - 1, day);
                return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
              }}
            />

            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(value: string) => {
                    // Parse date string to avoid timezone issues
                    const [year, month, day] = value.split('-').map(Number);
                    const date = new Date(year, month - 1, day);
                    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  }}
                />
              }
            />

            <Area dataKey="callsMade" type="natural" fill="url(#fillCallsMade)" stroke="#3b82f6" stackId="a" />
            <Area dataKey="meetingsBooked" type="natural" fill="url(#fillMeetingsBooked)" stroke="#22c55e" stackId="a" />

            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
