"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CHECK_LABELS, type BoardFinding, type CheckType } from "@/lib/mock-data"

interface RiskBreakdownProps {
  findings: BoardFinding[]
}

export function RiskBreakdown({ findings }: RiskBreakdownProps) {
  const countByCheck = findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.check] = (acc[f.check] || 0) + 1
    return acc
  }, {})

  const sorted = Object.entries(countByCheck).sort(([, a], [, b]) => b - a)
  const max = sorted.length > 0 ? sorted[0][1] : 1

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-foreground">Risk Distribution by Check Type</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {sorted.map(([check, count]) => (
            <div key={check} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{CHECK_LABELS[check as CheckType]}</span>
                <span className="text-xs font-medium text-foreground tabular-nums">{count} boards</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-secondary">
                <div
                  className="h-1.5 rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
          {sorted.length === 0 && (
            <p className="text-sm text-muted-foreground">No findings recorded yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
