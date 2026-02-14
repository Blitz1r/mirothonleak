export type Severity = "low" | "medium" | "high"
export type CheckType = "public_link" | "anon_access" | "stale" | "editors" | "sensitive_text"
export type ProbeStatus = "viewable" | "protected" | "unreachable"

export interface SettingsConfig {
  staleDaysThreshold: number
  maxEditorsThreshold: number
  sensitiveKeywords: string[]
}

export interface BoardFinding {
  id: string
  scanId: string
  boardId: string
  boardName: string
  check: CheckType
  severity: Severity
  score: number
  details: Record<string, unknown>
}

export interface ScannedBoard {
  boardId: string
  boardName: string
  owner: string
  team: string
  lastModified: string
  riskScore: number
  severity: Severity
  findings: BoardFinding[]
}

export interface ScanSummary {
  id: string
  userId: string
  createdAt: string
  totalBoards: number
  overallScore: number
  highRisk: number
  mediumRisk: number
  lowRisk: number
}

export interface ScanRecord {
  summary: ScanSummary
  boards: ScannedBoard[]
}

export interface ProbeResult {
  id: string
  sessionId: string
  boardUrl: string
  boardId: string
  status: ProbeStatus
  httpCode: number
  checkedAt: string
}

export interface ProbeSession {
  id: string
  createdAt: string
  results: ProbeResult[]
}

export interface OAuthState {
  id: string
  createdAt: number
}

export interface MiroSession {
  id: string
  userId: string
  accessToken: string
  refreshToken?: string
  expiresAt?: number
  createdAt: number
}

export interface MiroBoard {
  id: string
  name: string
  modifiedAt?: string
  owner?: string
  team?: string
  editorCount?: number
  publicAccess?: boolean
  anonymousAccess?: boolean
  contentText?: string
}
