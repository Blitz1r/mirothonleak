// Types
export type Severity = "low" | "medium" | "high"
export type CheckType = "public_link" | "public_edit_access" | "stale" | "editors" | "sensitive_text"
export type ProbeStatus = "viewable" | "protected" | "unreachable"

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

export interface ProbeResult {
  id: string
  sessionId: string
  boardUrl: string
  boardId: string
  status: ProbeStatus
  httpCode: number
  checkedAt: string
}

export interface SettingsConfig {
  staleDaysThreshold: number
  maxEditorsThreshold: number
  sensitiveKeywords: string[]
}

// Check labels & remediation
export const CHECK_LABELS: Record<CheckType, string> = {
  public_link: "Public Link Sharing",
  public_edit_access: "Public Edit Access",
  stale: "Stale Board",
  editors: "Too Many Editors",
  sensitive_text: "Sensitive Text Detected",
}

export const CHECK_REMEDIATION: Record<CheckType, string> = {
  public_link: "Disable public link sharing in board settings. Go to Share, then Link sharing.",
  public_edit_access: "Restrict public links to view/comment only and require explicit invite for edit rights.",
  stale: "Archive or delete this board if it is no longer needed.",
  editors: "Review the member list and downgrade unnecessary editors to viewers.",
  sensitive_text: "Review flagged content and remove or redact sensitive information.",
}

export const CHECK_WEIGHTS: Record<CheckType, number> = {
  public_link: 30,
  public_edit_access: 20,
  stale: 10,
  editors: 10,
  sensitive_text: 15,
}

// Mock scan history
export const MOCK_SCANS: ScanSummary[] = [
  {
    id: "scan-001",
    userId: "user-miro-001",
    createdAt: "2026-02-14T10:30:00Z",
    totalBoards: 12,
    overallScore: 38,
    highRisk: 2,
    mediumRisk: 5,
    lowRisk: 5,
  },
  {
    id: "scan-002",
    userId: "user-miro-001",
    createdAt: "2026-02-10T14:15:00Z",
    totalBoards: 12,
    overallScore: 45,
    highRisk: 3,
    mediumRisk: 4,
    lowRisk: 5,
  },
  {
    id: "scan-003",
    userId: "user-miro-001",
    createdAt: "2026-02-01T09:00:00Z",
    totalBoards: 10,
    overallScore: 52,
    highRisk: 4,
    mediumRisk: 3,
    lowRisk: 3,
  },
]

// Mock scanned boards
export const MOCK_BOARDS: ScannedBoard[] = [
  {
    boardId: "uXjVGBA5C7k=",
    boardName: "Q1 Product Roadmap",
    owner: "alice@company.com",
    team: "Product",
    lastModified: "2026-02-13T16:00:00Z",
    riskScore: 60,
    severity: "high",
    findings: [
      { id: "f1", scanId: "scan-001", boardId: "uXjVGBA5C7k=", boardName: "Q1 Product Roadmap", check: "public_link", severity: "high", score: 30, details: { sharingPolicy: "anyone" } },
      { id: "f2", scanId: "scan-001", boardId: "uXjVGBA5C7k=", boardName: "Q1 Product Roadmap", check: "public_edit_access", severity: "high", score: 20, details: { publicEditAllowed: true } },
      { id: "f3", scanId: "scan-001", boardId: "uXjVGBA5C7k=", boardName: "Q1 Product Roadmap", check: "editors", severity: "medium", score: 10, details: { editorCount: 14 } },
    ],
  },
  {
    boardId: "uXjVH3kLm9Q=",
    boardName: "API Keys & Secrets Planning",
    owner: "bob@company.com",
    team: "Engineering",
    lastModified: "2025-10-05T08:30:00Z",
    riskScore: 55,
    severity: "high",
    findings: [
      { id: "f4", scanId: "scan-001", boardId: "uXjVH3kLm9Q=", boardName: "API Keys & Secrets Planning", check: "sensitive_text", severity: "high", score: 15, details: { keywords: ["API key", "secret", "password"] } },
      { id: "f5", scanId: "scan-001", boardId: "uXjVH3kLm9Q=", boardName: "API Keys & Secrets Planning", check: "public_link", severity: "high", score: 30, details: { sharingPolicy: "anyone" } },
      { id: "f6", scanId: "scan-001", boardId: "uXjVH3kLm9Q=", boardName: "API Keys & Secrets Planning", check: "stale", severity: "medium", score: 10, details: { daysSinceModified: 132 } },
    ],
  },
  {
    boardId: "uXjVJ8nPq2R=",
    boardName: "Sprint Retro - Jan 2026",
    owner: "carol@company.com",
    team: "Engineering",
    lastModified: "2026-01-30T17:45:00Z",
    riskScore: 30,
    severity: "medium",
    findings: [
      { id: "f7", scanId: "scan-001", boardId: "uXjVJ8nPq2R=", boardName: "Sprint Retro - Jan 2026", check: "public_link", severity: "high", score: 30, details: { sharingPolicy: "anyone" } },
    ],
  },
  {
    boardId: "uXjVK1aWx5T=",
    boardName: "Design System v3",
    owner: "diana@company.com",
    team: "Design",
    lastModified: "2026-02-12T11:20:00Z",
    riskScore: 20,
    severity: "medium",
    findings: [
      { id: "f8", scanId: "scan-001", boardId: "uXjVK1aWx5T=", boardName: "Design System v3", check: "editors", severity: "medium", score: 10, details: { editorCount: 12 } },
      { id: "f9", scanId: "scan-001", boardId: "uXjVK1aWx5T=", boardName: "Design System v3", check: "stale", severity: "low", score: 10, details: { daysSinceModified: 2 } },
    ],
  },
  {
    boardId: "uXjVL4bNy8U=",
    boardName: "User Research Insights",
    owner: "eve@company.com",
    team: "Product",
    lastModified: "2025-11-15T14:10:00Z",
    riskScore: 40,
    severity: "medium",
    findings: [
      { id: "f10", scanId: "scan-001", boardId: "uXjVL4bNy8U=", boardName: "User Research Insights", check: "stale", severity: "medium", score: 10, details: { daysSinceModified: 91 } },
      { id: "f11", scanId: "scan-001", boardId: "uXjVL4bNy8U=", boardName: "User Research Insights", check: "public_edit_access", severity: "high", score: 20, details: { publicEditAllowed: true } },
      { id: "f12", scanId: "scan-001", boardId: "uXjVL4bNy8U=", boardName: "User Research Insights", check: "editors", severity: "medium", score: 10, details: { editorCount: 11 } },
    ],
  },
  {
    boardId: "uXjVM7cOz1V=",
    boardName: "Marketing Campaign - Q1",
    owner: "frank@company.com",
    team: "Marketing",
    lastModified: "2026-02-14T09:00:00Z",
    riskScore: 10,
    severity: "low",
    findings: [
      { id: "f13", scanId: "scan-001", boardId: "uXjVM7cOz1V=", boardName: "Marketing Campaign - Q1", check: "editors", severity: "low", score: 10, details: { editorCount: 11 } },
    ],
  },
  {
    boardId: "uXjVN0dPa4W=",
    boardName: "Onboarding Flow Wireframes",
    owner: "grace@company.com",
    team: "Design",
    lastModified: "2026-02-08T15:30:00Z",
    riskScore: 0,
    severity: "low",
    findings: [],
  },
  {
    boardId: "uXjVO3eTb7X=",
    boardName: "Architecture Decision Records",
    owner: "henry@company.com",
    team: "Engineering",
    lastModified: "2026-01-20T10:45:00Z",
    riskScore: 10,
    severity: "low",
    findings: [
      { id: "f14", scanId: "scan-001", boardId: "uXjVO3eTb7X=", boardName: "Architecture Decision Records", check: "stale", severity: "low", score: 10, details: { daysSinceModified: 25 } },
    ],
  },
  {
    boardId: "uXjVP6fUc0Y=",
    boardName: "Customer Journey Map",
    owner: "iris@company.com",
    team: "Product",
    lastModified: "2025-09-20T12:00:00Z",
    riskScore: 30,
    severity: "medium",
    findings: [
      { id: "f15", scanId: "scan-001", boardId: "uXjVP6fUc0Y=", boardName: "Customer Journey Map", check: "stale", severity: "medium", score: 10, details: { daysSinceModified: 148 } },
      { id: "f16", scanId: "scan-001", boardId: "uXjVP6fUc0Y=", boardName: "Customer Journey Map", check: "public_edit_access", severity: "high", score: 20, details: { publicEditAllowed: true } },
    ],
  },
  {
    boardId: "uXjVQ9gVd3Z=",
    boardName: "Weekly Standup Notes",
    owner: "jack@company.com",
    team: "Engineering",
    lastModified: "2026-02-14T08:00:00Z",
    riskScore: 0,
    severity: "low",
    findings: [],
  },
  {
    boardId: "uXjVR2hWe6A=",
    boardName: "Incident Response Plan",
    owner: "kate@company.com",
    team: "Security",
    lastModified: "2026-02-05T13:15:00Z",
    riskScore: 20,
    severity: "medium",
    findings: [
      { id: "f17", scanId: "scan-001", boardId: "uXjVR2hWe6A=", boardName: "Incident Response Plan", check: "editors", severity: "medium", score: 10, details: { editorCount: 15 } },
      { id: "f18", scanId: "scan-001", boardId: "uXjVR2hWe6A=", boardName: "Incident Response Plan", check: "stale", severity: "low", score: 10, details: { daysSinceModified: 9 } },
    ],
  },
  {
    boardId: "uXjVS5iXf9B=",
    boardName: "Competitor Analysis 2025",
    owner: "leo@company.com",
    team: "Product",
    lastModified: "2025-12-01T16:30:00Z",
    riskScore: 45,
    severity: "medium",
    findings: [
      { id: "f19", scanId: "scan-001", boardId: "uXjVS5iXf9B=", boardName: "Competitor Analysis 2025", check: "sensitive_text", severity: "medium", score: 15, details: { keywords: ["confidential"] } },
      { id: "f20", scanId: "scan-001", boardId: "uXjVS5iXf9B=", boardName: "Competitor Analysis 2025", check: "public_link", severity: "high", score: 30, details: { sharingPolicy: "anyone" } },
    ],
  },
]

// Mock probe results
export const MOCK_PROBE_RESULTS: ProbeResult[] = [
  { id: "p1", sessionId: "sess-001", boardUrl: "https://miro.com/app/board/uXjVGBA5C7k=/", boardId: "uXjVGBA5C7k=", status: "viewable", httpCode: 200, checkedAt: "2026-02-14T10:35:00Z" },
  { id: "p2", sessionId: "sess-001", boardUrl: "https://miro.com/app/board/uXjVH3kLm9Q=/", boardId: "uXjVH3kLm9Q=", status: "protected", httpCode: 401, checkedAt: "2026-02-14T10:35:01Z" },
  { id: "p3", sessionId: "sess-001", boardUrl: "https://miro.com/app/board/uXjVINVALID=/", boardId: "uXjVINVALID=", status: "unreachable", httpCode: 404, checkedAt: "2026-02-14T10:35:02Z" },
  { id: "p4", sessionId: "sess-001", boardUrl: "https://miro.com/app/board/uXjVJ8nPq2R=/", boardId: "uXjVJ8nPq2R=", status: "viewable", httpCode: 200, checkedAt: "2026-02-14T10:35:03Z" },
  { id: "p5", sessionId: "sess-001", boardUrl: "https://miro.com/app/board/uXjVK1aWx5T=/", boardId: "uXjVK1aWx5T=", status: "protected", httpCode: 403, checkedAt: "2026-02-14T10:35:04Z" },
]

// Default settings
export const DEFAULT_SETTINGS: SettingsConfig = {
  staleDaysThreshold: 90,
  maxEditorsThreshold: 10,
  sensitiveKeywords: ["password", "secret", "API key", "token", "SSN", "credit card", "private key"],
}

// Utility functions
export function getSeverityFromScore(score: number): Severity {
  if (score >= 50) return "high"
  if (score >= 20) return "medium"
  return "low"
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function getOverallPostureScore(boards: ScannedBoard[]): number {
  if (boards.length === 0) return 0
  const total = boards.reduce((sum, b) => sum + b.riskScore, 0)
  return Math.round(total / boards.length)
}
