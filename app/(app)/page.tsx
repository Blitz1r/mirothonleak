"use client"

import { Shield, AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { PostureGauge } from "@/components/dashboard/posture-gauge"
import { RiskBreakdown } from "@/components/dashboard/risk-breakdown"
import { TopRisksTable } from "@/components/dashboard/top-risks-table"
import { RecentScans } from "@/components/dashboard/recent-scans"
import {
  MOCK_BOARDS,
  MOCK_SCANS,
  getOverallPostureScore,
  getSeverityFromScore,
} from "@/lib/mock-data"

export default function DashboardPage() {
  const allFindings = MOCK_BOARDS.flatMap((b) => b.findings)
  const overallScore = getOverallPostureScore(MOCK_BOARDS)
  const overallSeverity = getSeverityFromScore(overallScore)
  const highRiskCount = MOCK_BOARDS.filter((b) => b.severity === "high").length
  const mediumRiskCount = MOCK_BOARDS.filter((b) => b.severity === "medium").length
  const lowRiskCount = MOCK_BOARDS.filter((b) => b.severity === "low").length

  const stats = [
    {
      label: "Total Boards",
      value: MOCK_BOARDS.length,
      icon: Shield,
      color: "text-primary",
    },
    {
      label: "High Risk",
      value: highRiskCount,
      icon: ShieldAlert,
      color: "text-severity-high",
    },
    {
      label: "Medium Risk",
      value: mediumRiskCount,
      icon: AlertTriangle,
      color: "text-severity-medium",
    },
    {
      label: "Low Risk",
      value: lowRiskCount,
      icon: ShieldCheck,
      color: "text-severity-low",
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Security Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your Miro workspace security posture
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card border-border">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold tabular-nums text-foreground">{stat.value}</span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gauge + Breakdown */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-card border-border flex items-center justify-center p-6">
          <PostureGauge
            score={overallScore}
            severity={overallSeverity}
            label="Overall Posture"
          />
        </Card>
        <div className="lg:col-span-2">
          <RiskBreakdown findings={allFindings} />
        </div>
      </div>

      {/* Top risks + Recent scans */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TopRisksTable boards={MOCK_BOARDS} />
        <RecentScans scans={MOCK_SCANS} />
      </div>
    </div>
  )
}
