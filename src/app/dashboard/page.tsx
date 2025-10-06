import { JustCallMetrics } from "@/components/dashboard/justcall-metrics"
import { EngagedLeadsMetrics } from "@/components/dashboard/engaged-leads-metrics"
import { ProtectedRoute } from "@/components/auth/protected-route"

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className="flex-1 p-4 md:p-8 space-y-8">
        <JustCallMetrics />
        <EngagedLeadsMetrics />
      </div>
    </ProtectedRoute>
  )
}
