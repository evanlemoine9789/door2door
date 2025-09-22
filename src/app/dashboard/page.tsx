import { JustCallMetrics } from "@/components/dashboard/justcall-metrics"
import { ProtectedRoute } from "@/components/auth/protected-route"

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-card-foreground">Dashboard</h1>
            <p className="text-muted-foreground text-xs">Monitor your business metrics and performance</p>
          </div>
        </div>
        
        <JustCallMetrics />
      </div>
    </ProtectedRoute>
  )
}
