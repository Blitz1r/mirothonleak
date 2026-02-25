import { getSeverityFromScore, clampScore, createId } from "@/lib/server/utils"
import type {
  BoardFinding,
  CheckType,
  MiroBoard,
  ScanRecord,
  ScanSummary,
  ScannedBoard,
  SettingsConfig,
} from "@/lib/server/types"

function daysSince(dateIso?: string): number {
  if (!dateIso) return Number.MAX_SAFE_INTEGER
  const modifiedAt = new Date(dateIso).getTime()
  if (Number.isNaN(modifiedAt)) return Number.MAX_SAFE_INTEGER

  const diffMs = Date.now() - modifiedAt
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

function createFinding(
  scanId: string,
  board: MiroBoard,
  check: BoardFinding["check"],
  score: number,
  details: Record<string, unknown>,
): BoardFinding {
  return {
    id: createId("finding"),
    scanId,
    boardId: board.id,
    boardName: board.name,
    check,
    score,
    severity: getSeverityFromScore(score),
    details,
  }
}

function detectSensitiveHits(content: string, keywords: string[]): string[] {
  const source = content.toLowerCase()
  return keywords.filter((keyword) => source.includes(keyword.toLowerCase()))
}

function isCheckEnabled(settings: SettingsConfig, check: CheckType): boolean {
  return settings.riskChecks[check]?.enabled ?? true
}

function getCheckWeight(settings: SettingsConfig, check: CheckType): number {
  return settings.riskChecks[check]?.weight ?? 0
}

function scanBoard(scanId: string, board: MiroBoard, settings: SettingsConfig): ScannedBoard {
  const findings: BoardFinding[] = []

  if (isCheckEnabled(settings, "public_link") && board.publicAccess) {
    findings.push(
      createFinding(scanId, board, "public_link", getCheckWeight(settings, "public_link"), {
        publicAccess: true,
      }),
    )
  }

  if (isCheckEnabled(settings, "public_edit_access") && board.publicAccess && board.publicEditAccess) {
    findings.push(
      createFinding(scanId, board, "public_edit_access", getCheckWeight(settings, "public_edit_access"), {
        publicAccess: true,
        publicEditAccess: true,
      }),
    )
  }

  const staleDays = daysSince(board.modifiedAt)
  if (isCheckEnabled(settings, "stale") && staleDays >= settings.staleDaysThreshold) {
    findings.push(
      createFinding(scanId, board, "stale", getCheckWeight(settings, "stale"), {
        daysSinceModified: staleDays,
        threshold: settings.staleDaysThreshold,
      }),
    )
  }

  if (isCheckEnabled(settings, "editors") && typeof board.editorCount === "number" && board.editorCount > settings.maxEditorsThreshold) {
    findings.push(
      createFinding(scanId, board, "editors", getCheckWeight(settings, "editors"), {
        editorCount: board.editorCount,
        threshold: settings.maxEditorsThreshold,
      }),
    )
  }

  const sensitiveHits = detectSensitiveHits(board.contentText ?? "", settings.sensitiveKeywords)
  if (isCheckEnabled(settings, "sensitive_text") && sensitiveHits.length > 0) {
    findings.push(
      createFinding(scanId, board, "sensitive_text", getCheckWeight(settings, "sensitive_text"), {
        keywords: sensitiveHits,
      }),
    )
  }

  const riskScore = clampScore(findings.reduce((acc, item) => acc + item.score, 0))

  return {
    boardId: board.id,
    boardName: board.name,
    owner: board.owner ?? "unknown",
    team: board.team ?? "unknown",
    lastModified: board.modifiedAt ?? new Date(0).toISOString(),
    riskScore,
    severity: getSeverityFromScore(riskScore),
    findings,
  }
}

export function runScan(userId: string, boards: MiroBoard[], settings: SettingsConfig): ScanRecord {
  const scanId = createId("scan")
  const scannedBoards = boards.map((board) => scanBoard(scanId, board, settings))

  const totalScore = scannedBoards.reduce((acc, board) => acc + board.riskScore, 0)
  const overallScore = scannedBoards.length > 0 ? Math.round(totalScore / scannedBoards.length) : 0

  const summary: ScanSummary = {
    id: scanId,
    userId,
    createdAt: new Date().toISOString(),
    totalBoards: scannedBoards.length,
    overallScore,
    highRisk: scannedBoards.filter((item) => item.severity === "high").length,
    mediumRisk: scannedBoards.filter((item) => item.severity === "medium").length,
    lowRisk: scannedBoards.filter((item) => item.severity === "low").length,
  }

  return {
    summary,
    boards: scannedBoards,
  }
}
