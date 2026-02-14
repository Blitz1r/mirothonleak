"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatDate, getSeverityFromScore, type ScanSummary } from "@/lib/mock-data"
import { Clock, AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react"

interface RecentScansProps {
  scans: ScanSummary[]
}

const severityBadge: Record<string, string> = {
  low: "border-severity-low/30 bg-severity-low/10 text-severity-low",
  medium: "border-severity-medium/30 bg-severity-medium/10 text-severity-medium",
  high: "border-severity-high/30 bg-severity-high/10 text-severity-high",
}

export function RecentScans({ scans }: RecentScansProps) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-foreground">Recent Scans</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {scans.map((scan) => {
            const severity = getSeverityFromScore(scan.overallScore)
            return (
              <div
                key={scan.id}
                className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  {severity === "high" ? (
                    <ShieldAlert className="h-4 w-4 text-severity-high" />
                  ) : severity === "medium" ? (
                    <AlertTriangle className="h-4 w-4 text-severity-medium" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 text-severity-low" />
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      {scan.totalBoards} boards scanned
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(scan.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-sm font-mono font-semibold tabular-nums text-foreground">
                      {scan.overallScore}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] capitalize px-1.5 py-0", severityBadge[severity])}
                    >
                      {severity}
                    </Badge>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
