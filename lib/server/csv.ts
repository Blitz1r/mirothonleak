import type { ProbeSession, ScanRecord } from "@/lib/server/types"

function escapeCsv(value: unknown): string {
  const text = String(value ?? "")
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function scanToCsv(record: ScanRecord): string {
  const header = [
    "scan_id",
    "created_at",
    "board_id",
    "board_name",
    "owner",
    "team",
    "risk_score",
    "severity",
    "check",
    "check_score",
    "check_severity",
    "details",
  ]

  const rows = [header.join(",")]

  for (const board of record.boards) {
    if (board.findings.length === 0) {
      rows.push([
        record.summary.id,
        record.summary.createdAt,
        board.boardId,
        board.boardName,
        board.owner,
        board.team,
        board.riskScore,
        board.severity,
        "",
        "",
        "",
        "",
      ].map(escapeCsv).join(","))
      continue
    }

    for (const finding of board.findings) {
      rows.push([
        record.summary.id,
        record.summary.createdAt,
        board.boardId,
        board.boardName,
        board.owner,
        board.team,
        board.riskScore,
        board.severity,
        finding.check,
        finding.score,
        finding.severity,
        JSON.stringify(finding.details),
      ].map(escapeCsv).join(","))
    }
  }

  return rows.join("\n")
}

export function probeToCsv(session: ProbeSession): string {
  const header = ["session_id", "board_url", "board_id", "status", "http_code", "checked_at"]
  const rows = [header.join(",")]

  for (const result of session.results) {
    rows.push([
      result.sessionId,
      result.boardUrl,
      result.boardId,
      result.status,
      result.httpCode,
      result.checkedAt,
    ].map(escapeCsv).join(","))
  }

  return rows.join("\n")
}
