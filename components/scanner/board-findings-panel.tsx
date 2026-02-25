"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  CHECK_LABELS,
  CHECK_REMEDIATION,
  type BoardFinding,
  type CheckType,
} from "@/lib/mock-data"
import {
  Globe,
  UserX,
  Clock,
  Users,
  FileWarning,
  Lightbulb,
} from "lucide-react"

const checkIcons: Record<CheckType, React.ElementType> = {
  public_link: Globe,
  public_edit_access: UserX,
  stale: Clock,
  editors: Users,
  sensitive_text: FileWarning,
}

const severityBadge: Record<string, string> = {
  low: "border-severity-low/30 bg-severity-low/10 text-severity-low",
  medium: "border-severity-medium/30 bg-severity-medium/10 text-severity-medium",
  high: "border-severity-high/30 bg-severity-high/10 text-severity-high",
}

interface BoardFindingsPanelProps {
  findings: BoardFinding[]
  boardName: string
}

export function BoardFindingsPanel({ findings, boardName }: BoardFindingsPanelProps) {
  if (findings.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-severity-low/10">
            <Lightbulb className="h-5 w-5 text-severity-low" />
          </div>
          <p className="mt-3 text-sm font-medium text-foreground">No issues found</p>
          <p className="text-xs text-muted-foreground">{boardName} has a clean security posture.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {findings.map((finding) => {
        const Icon = checkIcons[finding.check]
        return (
          <Card key={finding.id} className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium text-foreground">
                    {CHECK_LABELS[finding.check]}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn("capitalize text-[10px]", severityBadge[finding.severity])}
                  >
                    {finding.severity}
                  </Badge>
                  <span className="text-xs font-mono text-muted-foreground">+{finding.score}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md bg-secondary/50 p-3">
                <div className="flex items-start gap-2">
                  <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {CHECK_REMEDIATION[finding.check]}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
