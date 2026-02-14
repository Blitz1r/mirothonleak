import { DEFAULT_SETTINGS, OAUTH_STATE_TTL_MS, PROBE_RATE_LIMIT_PER_MIN } from "@/lib/server/constants"
import type { MiroSession, OAuthState, ProbeSession, ScanRecord, SettingsConfig } from "@/lib/server/types"

const scansById = new Map<string, ScanRecord>()
const scansByUser = new Map<string, string[]>()
const probesBySession = new Map<string, ProbeSession>()
const settingsByUser = new Map<string, SettingsConfig>()
const oauthStates = new Map<string, OAuthState>()
const miroSessions = new Map<string, MiroSession>()
const probeRateByIp = new Map<string, number[]>()

export function putScan(userId: string, scanId: string, record: ScanRecord): void {
  scansById.set(scanId, record)
  const ids = scansByUser.get(userId) ?? []
  scansByUser.set(userId, [scanId, ...ids])
}

export function getScan(scanId: string): ScanRecord | undefined {
  return scansById.get(scanId)
}

export function listScans(userId: string): ScanRecord[] {
  const ids = scansByUser.get(userId) ?? []
  return ids.map((id) => scansById.get(id)).filter((value): value is ScanRecord => Boolean(value))
}

export function putProbeSession(session: ProbeSession): void {
  probesBySession.set(session.id, session)
}

export function getProbeSession(sessionId: string): ProbeSession | undefined {
  return probesBySession.get(sessionId)
}

export function getUserSettings(userId: string): SettingsConfig {
  return settingsByUser.get(userId) ?? DEFAULT_SETTINGS
}

export function setUserSettings(userId: string, settings: SettingsConfig): void {
  settingsByUser.set(userId, settings)
}

export function putOAuthState(stateId: string): void {
  oauthStates.set(stateId, { id: stateId, createdAt: Date.now() })
}

export function consumeOAuthState(stateId: string): boolean {
  const state = oauthStates.get(stateId)
  if (!state) return false

  oauthStates.delete(stateId)
  return Date.now() - state.createdAt <= OAUTH_STATE_TTL_MS
}

export function putMiroSession(session: MiroSession): void {
  miroSessions.set(session.id, session)
}

export function getMiroSession(sessionId?: string): MiroSession | undefined {
  if (!sessionId) return undefined
  return miroSessions.get(sessionId)
}

export function isProbeRateLimited(ip: string): boolean {
  const now = Date.now()
  const start = now - 60_000
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
