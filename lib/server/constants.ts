import type { CheckType, SettingsConfig } from "@/lib/server/types"

export const CHECK_WEIGHTS: Record<CheckType, number> = {
  public_link: 30,
  public_edit_access: 20,
  stale: 10,
  editors: 10,
  sensitive_text: 15,
}

export const DEFAULT_SETTINGS: SettingsConfig = {
  staleDaysThreshold: 90,
  maxEditorsThreshold: 10,
  sensitiveKeywords: ["password", "secret", "API key", "token", "SSN", "credit card", "private key"],
}

export const MIRO_SESSION_COOKIE = "miro_session_id"
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000
export const PROBE_RATE_LIMIT_PER_MIN = 100
