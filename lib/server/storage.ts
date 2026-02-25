import { DEFAULT_SETTINGS, OAUTH_STATE_TTL_MS, PROBE_RATE_LIMIT_PER_MIN } from "@/lib/server/constants"
import { getDatabaseClient } from "@/lib/server/db"
import type { MiroSession, OAuthState, ProbeSession, ScanRecord, SettingsConfig } from "@/lib/server/types"

const scansById = new Map<string, ScanRecord>()
const scansByUser = new Map<string, string[]>()
const probesBySession = new Map<string, ProbeSession>()
const settingsByUser = new Map<string, SettingsConfig>()
const oauthStates = new Map<string, OAuthState>()
const miroSessions = new Map<string, MiroSession>()
const probeRateByIp = new Map<string, number[]>()

function parseFindings(value: unknown): ScanRecord["boards"][number]["findings"] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is ScanRecord["boards"][number]["findings"][number] => Boolean(item))
}

function rowToScanRecord(summaryRow: { summary: unknown }, boardRows: Record<string, unknown>[]): ScanRecord {
  const summary = summaryRow.summary as ScanRecord["summary"]

  return {
    summary,
    boards: boardRows.map((row) => ({
      boardId: String(row.board_id ?? ""),
      boardName: String(row.board_name ?? ""),
      owner: String(row.owner ?? "unknown"),
      team: String(row.team ?? "unknown"),
      lastModified: String(row.last_modified ?? new Date(0).toISOString()),
      riskScore: Number(row.risk_score ?? 0),
      severity: (row.severity as ScanRecord["boards"][number]["severity"]) ?? "low",
      findings: parseFindings(row.findings),
    })),
  }
}

export async function putScan(userId: string, scanId: string, record: ScanRecord): Promise<void> {
  scansById.set(scanId, record)
  const ids = scansByUser.get(userId) ?? []
  scansByUser.set(userId, [scanId, ...ids])

  const db = getDatabaseClient()
  if (!db) return

  const { error: scanError } = await db.from("scans").upsert({
    id: record.summary.id,
    user_id: userId,
    created_at: record.summary.createdAt,
    summary: record.summary,
  })

  if (scanError) {
    console.error("Failed to persist scan summary", scanError)
    return
  }

  const { error: deleteBoardsError } = await db.from("scan_boards").delete().eq("scan_id", scanId)
  if (deleteBoardsError) {
    console.error("Failed to clear existing scan boards", deleteBoardsError)
    return
  }

  if (record.boards.length === 0) return

  const boardRows = record.boards.map((board) => ({
    scan_id: scanId,
    board_id: board.boardId,
    board_name: board.boardName,
    owner: board.owner,
    team: board.team,
    last_modified: board.lastModified,
    risk_score: board.riskScore,
    severity: board.severity,
    findings: board.findings,
  }))

  const { error: boardsError } = await db.from("scan_boards").insert(boardRows)
  if (boardsError) {
    console.error("Failed to persist scan boards", boardsError)
  }
}

export async function getScanForUser(userId: string, scanId: string): Promise<ScanRecord | undefined> {
  const db = getDatabaseClient()
  if (!db) {
    const ownedIds = scansByUser.get(userId) ?? []
    if (!ownedIds.includes(scanId)) {
      return undefined
    }

    return scansById.get(scanId)
  }

  const { data: summaryRow, error: summaryError } = await db
    .from("scans")
    .select("summary")
    .eq("id", scanId)
    .eq("user_id", userId)
    .maybeSingle()

  if (summaryError) {
    console.error("Failed to fetch scan summary", summaryError)
    return scansById.get(scanId)
  }

  if (!summaryRow) {
    return undefined
  }

  const { data: boardRows, error: boardsError } = await db
    .from("scan_boards")
    .select("board_id, board_name, owner, team, last_modified, risk_score, severity, findings")
    .eq("scan_id", scanId)

  if (boardsError) {
    console.error("Failed to fetch scan boards", boardsError)
    return undefined
  }

  return rowToScanRecord(summaryRow as { summary: unknown }, (boardRows ?? []) as Record<string, unknown>[])
}

export async function listScans(userId: string): Promise<ScanRecord[]> {
  const db = getDatabaseClient()
  if (!db) {
    const ids = scansByUser.get(userId) ?? []
    return ids.map((id) => scansById.get(id)).filter((value): value is ScanRecord => Boolean(value))
  }

  const { data: rows, error } = await db
    .from("scans")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Failed to list scans", error)
    return []
  }

  const records = await Promise.all((rows ?? []).map((row) => getScanForUser(userId, String(row.id))))
  return records.filter((value): value is ScanRecord => Boolean(value))
}

export async function listScanSummaries(userId: string): Promise<ScanRecord["summary"][]> {
  const db = getDatabaseClient()
  if (!db) {
    const records = await listScans(userId)
    return records.map((record) => record.summary)
  }

  const { data, error } = await db
    .from("scans")
    .select("summary")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Failed to list scan summaries", error)
    return []
  }

  return (data ?? []).map((row) => row.summary as ScanRecord["summary"])
}

export async function putProbeSession(session: ProbeSession): Promise<void> {
  probesBySession.set(session.id, session)

  const db = getDatabaseClient()
  if (!db) return

  const { error: sessionError } = await db.from("probe_sessions").upsert({
    id: session.id,
    user_id: session.userId,
    created_at: session.createdAt,
  })

  if (sessionError) {
    console.error("Failed to persist probe session", sessionError)
    return
  }

  const { error: deleteResultsError } = await db.from("probe_results").delete().eq("session_id", session.id)
  if (deleteResultsError) {
    console.error("Failed to clear probe results", deleteResultsError)
    return
  }

  if (session.results.length === 0) return

  const resultRows = session.results.map((result) => ({
    id: result.id,
    session_id: result.sessionId,
    board_url: result.boardUrl,
    board_id: result.boardId,
    status: result.status,
    http_code: result.httpCode,
    checked_at: result.checkedAt,
  }))

  const { error: resultsError } = await db.from("probe_results").insert(resultRows)
  if (resultsError) {
    console.error("Failed to persist probe results", resultsError)
  }
}

export async function getProbeSessionForUser(userId: string, sessionId: string): Promise<ProbeSession | undefined> {
  const db = getDatabaseClient()
  if (!db) {
    const session = probesBySession.get(sessionId)
    if (!session || session.userId !== userId) {
      return undefined
    }

    return session
  }

  const { data: sessionRow, error: sessionError } = await db
    .from("probe_sessions")
    .select("id, user_id, created_at")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle()

  if (sessionError) {
    console.error("Failed to fetch probe session", sessionError)
    return probesBySession.get(sessionId)
  }

  if (!sessionRow) {
    return undefined
  }

  const { data: resultRows, error: resultsError } = await db
    .from("probe_results")
    .select("id, session_id, board_url, board_id, status, http_code, checked_at")
    .eq("session_id", sessionId)
    .order("checked_at", { ascending: true })

  if (resultsError) {
    console.error("Failed to fetch probe results", resultsError)
    return undefined
  }

  return {
    id: String(sessionRow.id),
    userId: String(sessionRow.user_id),
    createdAt: String(sessionRow.created_at),
    results: (resultRows ?? []).map((row) => ({
      id: String(row.id),
      sessionId: String(row.session_id),
      boardUrl: String(row.board_url),
      boardId: String(row.board_id),
      status: row.status as ProbeSession["results"][number]["status"],
      httpCode: Number(row.http_code ?? 0),
      checkedAt: String(row.checked_at),
    })),
  }
}

export async function getUserSettings(userId: string): Promise<SettingsConfig> {
  const db = getDatabaseClient()
  if (!db) {
    return settingsByUser.get(userId) ?? DEFAULT_SETTINGS
  }

  const { data, error } = await db
    .from("user_settings")
    .select("stale_days_threshold, max_editors_threshold, sensitive_keywords, risk_checks")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    console.error("Failed to fetch user settings", error)
    return DEFAULT_SETTINGS
  }

  if (!data) {
    return DEFAULT_SETTINGS
  }

  return {
    staleDaysThreshold: Number(data.stale_days_threshold ?? DEFAULT_SETTINGS.staleDaysThreshold),
    maxEditorsThreshold: Number(data.max_editors_threshold ?? DEFAULT_SETTINGS.maxEditorsThreshold),
    sensitiveKeywords: Array.isArray(data.sensitive_keywords)
      ? data.sensitive_keywords.map((value: unknown) => String(value))
      : DEFAULT_SETTINGS.sensitiveKeywords,
    riskChecks:
      data.risk_checks && typeof data.risk_checks === "object"
        ? {
            ...DEFAULT_SETTINGS.riskChecks,
            ...(data.risk_checks as SettingsConfig["riskChecks"]),
          }
        : DEFAULT_SETTINGS.riskChecks,
  }
}

export async function setUserSettings(userId: string, settings: SettingsConfig): Promise<void> {
  settingsByUser.set(userId, settings)

  const db = getDatabaseClient()
  if (!db) return

  const { error } = await db.from("user_settings").upsert({
    user_id: userId,
    stale_days_threshold: settings.staleDaysThreshold,
    max_editors_threshold: settings.maxEditorsThreshold,
    sensitive_keywords: settings.sensitiveKeywords,
    risk_checks: settings.riskChecks,
    updated_at: new Date().toISOString(),
  })

  if (error) {
    console.error("Failed to persist user settings", error)
  }
}

export async function putOAuthState(stateId: string): Promise<void> {
  oauthStates.set(stateId, { id: stateId, createdAt: Date.now() })

  const db = getDatabaseClient()
  if (!db) return

  const { error } = await db.from("oauth_states").upsert({
    id: stateId,
    created_at: new Date().toISOString(),
  })

  if (error) {
    console.error("Failed to persist OAuth state", error)
  }
}

export async function consumeOAuthState(stateId: string): Promise<boolean> {
  const db = getDatabaseClient()
  if (!db) {
    const state = oauthStates.get(stateId)
    if (!state) return false

    oauthStates.delete(stateId)
    return Date.now() - state.createdAt <= OAUTH_STATE_TTL_MS
  }

  const { data: stateRow, error: readError } = await db
    .from("oauth_states")
    .select("created_at")
    .eq("id", stateId)
    .maybeSingle()

  if (readError) {
    console.error("Failed to read OAuth state", readError)
    return false
  }

  if (!stateRow?.created_at) return false

  const { error: deleteError } = await db.from("oauth_states").delete().eq("id", stateId)
  if (deleteError) {
    console.error("Failed to consume OAuth state", deleteError)
  }

  const createdAtMs = new Date(String(stateRow.created_at)).getTime()
  return Number.isFinite(createdAtMs) && Date.now() - createdAtMs <= OAUTH_STATE_TTL_MS
}

export async function putMiroSession(session: MiroSession): Promise<void> {
  miroSessions.set(session.id, session)

  const db = getDatabaseClient()
  if (!db) return

  const { error } = await db.from("miro_sessions").upsert({
    id: session.id,
    user_id: session.userId,
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
    expires_at: session.expiresAt,
    created_at: new Date(session.createdAt).toISOString(),
  })

  if (error) {
    console.error("Failed to persist Miro session", error)
  }
}

export async function getMiroSession(sessionId?: string): Promise<MiroSession | undefined> {
  if (!sessionId) return undefined

  const db = getDatabaseClient()
  if (!db) {
    return miroSessions.get(sessionId)
  }

  const { data, error } = await db
    .from("miro_sessions")
    .select("id, user_id, access_token, refresh_token, expires_at, created_at")
    .eq("id", sessionId)
    .maybeSingle()

  if (error) {
    console.error("Failed to fetch Miro session", error)
    return miroSessions.get(sessionId)
  }

  if (!data) return undefined

  return {
    id: String(data.id),
    userId: String(data.user_id),
    accessToken: String(data.access_token),
    refreshToken: data.refresh_token ? String(data.refresh_token) : undefined,
    expiresAt: typeof data.expires_at === "number" ? data.expires_at : undefined,
    createdAt: new Date(String(data.created_at)).getTime(),
  }
}

export async function isProbeRateLimited(ip: string): Promise<boolean> {
  const now = Date.now()
  const start = now - 60_000

  const db = getDatabaseClient()
  if (!db) {
    const bucket = probeRateByIp.get(ip) ?? []
    const fresh = bucket.filter((timestamp) => timestamp >= start)

    if (fresh.length >= PROBE_RATE_LIMIT_PER_MIN) {
      probeRateByIp.set(ip, fresh)
      return true
    }

    fresh.push(now)
    probeRateByIp.set(ip, fresh)
    return false
  }

  const { data, error: readError } = await db
    .from("probe_rate_limits")
    .select("bucket")
    .eq("ip", ip)
    .maybeSingle()

  if (readError) {
    console.error("Failed to read probe rate limit bucket", readError)
    return false
  }

  const bucket = Array.isArray(data?.bucket)
    ? (data.bucket as unknown[])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
    : []

  const fresh = bucket.filter((timestamp) => timestamp >= start)

  if (fresh.length >= PROBE_RATE_LIMIT_PER_MIN) {
    const { error: writeError } = await db.from("probe_rate_limits").upsert({
      ip,
      bucket: fresh,
      updated_at: new Date().toISOString(),
    })

    if (writeError) {
      console.error("Failed to write probe rate limit bucket", writeError)
    }

    return true
  }

  fresh.push(now)
  const { error: writeError } = await db.from("probe_rate_limits").upsert({
    ip,
    bucket: fresh,
    updated_at: new Date().toISOString(),
  })

  if (writeError) {
    console.error("Failed to update probe rate limit bucket", writeError)
  }

  return false
}
