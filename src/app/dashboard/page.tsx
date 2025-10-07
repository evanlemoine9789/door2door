import { JustCallMetrics } from "@/components/dashboard/justcall-metrics"
import { ProtectedRoute } from "@/components/auth/protected-route"

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className="flex-1 p-4 md:p-8">
        <JustCallMetrics />
      </div>
    </ProtectedRoute>
  )
}
