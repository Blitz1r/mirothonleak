"use client"

import { cn } from "@/lib/utils"
import type { Severity } from "@/lib/mock-data"

interface PostureGaugeProps {
  score: number
  severity: Severity
  label: string
}

const severityConfig: Record<Severity, { color: string; bgColor: string; label: string }> = {
  low: { color: "text-severity-low", bgColor: "bg-severity-low", label: "Low Risk" },
  medium: { color: "text-severity-medium", bgColor: "bg-severity-medium", label: "Medium Risk" },
  high: { color: "text-severity-high", bgColor: "bg-severity-high", label: "High Risk" },
}

export function PostureGauge({ score, severity, label }: PostureGaugeProps) {
  const config = severityConfig[severity]
  const radius = 60
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-36 w-36">
        <svg className="h-36 w-36 -rotate-90" viewBox="0 0 140 140">
          <circle
            cx="70"
            cy="70"
            r={radius}
            strokeWidth="10"
            stroke="hsl(var(--secondary))"
            fill="none"
          />
          <circle
            cx="70"
            cy="70"
            r={radius}
            strokeWidth="10"
            stroke={`hsl(var(--severity-${severity}))`}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-3xl font-bold tabular-nums", config.color)}>
            {score}
          </span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", config.color)}>
          <span className={cn("h-1.5 w-1.5 rounded-full", config.bgColor)} />
          {config.label}
        </span>
      </div>
    </div>
  )
}
