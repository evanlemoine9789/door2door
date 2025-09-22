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
import { fetchSmartleadChartData, SmartleadChartData } from "@/lib/supabase-smartlead"

const chartConfig = {
  emails:    { label: "Emails Sent",      color: "#3b82f6" },
  replies:   { label: "Replies",          color: "#eab308" },
  positives: { label: "Positive Replies", color: "#22c55e" },
} satisfies ChartConfig

export function SmartleadEmailArea() {
  const [timeRange, setTimeRange] = React.useState<"90d" | "30d" | "7d">("90d")
  const [chartData, setChartData] = React.useState<SmartleadChartData[]>([])
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
        
        const data = await fetchSmartleadChartData({ start: startStr, end: endStr })
        setChartData(data)
      } catch (error) {
        console.error('Error fetching smartlead chart data:', error)
        setChartData([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [timeRange])

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Cold Email — Daily Trend</CardTitle>
          <CardDescription>Emails sent, replies, positive replies</CardDescription>
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
              <linearGradient id="fillEmails" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="fillReplies" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#eab308" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#eab308" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="fillPositives" x1="0" y1="0" x2="0" y2="1">
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
              tickFormatter={(value: string) =>
                new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              }
            />

            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(value: string) =>
                    new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  }
                />
              }
            />

            <Area dataKey="emails"    type="natural" fill="url(#fillEmails)"    stroke="#3b82f6"    stackId="a" />
            <Area dataKey="replies"   type="natural" fill="url(#fillReplies)"   stroke="#eab308"   stackId="a" />
            <Area dataKey="positives" type="natural" fill="url(#fillPositives)" stroke="#22c55e" stackId="a" />

            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
