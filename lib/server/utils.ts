import type { ProbeStatus, Severity } from "@/lib/server/types"

export function getSeverityFromScore(score: number): Severity {
  if (score >= 50) return "high"
  if (score >= 20) return "medium"
  return "low"
}

export function clampScore(score: number): number {
  if (score < 0) return 0
  if (score > 100) return 100
  return score
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

export function parseMiroBoardId(url: string): string | null {
  const match = url.match(/miro\.com\/app\/board\/([a-zA-Z0-9_=]+)/)
  return match ? match[1] : null
}

export function classifyProbeStatus(httpCode: number, redirectedTo?: string): ProbeStatus {
  if (httpCode === 200) return "viewable"
  if (httpCode === 401 || httpCode === 403) return "protected"

  if ([301, 302, 303, 307, 308].includes(httpCode)) {
    if (redirectedTo && /(login|auth|signin)/i.test(redirectedTo)) {
      return "protected"
    }
    return "protected"
  }

  if (httpCode === 404) return "unreachable"
  return "unreachable"
}
