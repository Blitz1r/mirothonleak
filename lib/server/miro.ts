import type { MiroBoard } from "@/lib/server/types"

const MIRO_BASE_URL = "https://api.miro.com/v2"
const MIRO_OAUTH_AUTHORIZE = "https://miro.com/oauth/authorize"
const MIRO_OAUTH_TOKEN = "https://api.miro.com/v1/oauth/token"

interface MiroTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
}

interface MiroUserResponse {
  id: string
  name?: string
  email?: string
}

interface MiroTokenContextResponse {
  user?: {
    id?: string | number
    name?: string
    email?: string
  }
}

interface MiroBoardsResponse {
  data?: Array<Record<string, unknown>>
  cursor?: string | null
}

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export function getMiroRedirectUri(defaultOrigin?: string): string {
  if (process.env.MIRO_REDIRECT_URI) return process.env.MIRO_REDIRECT_URI
  if (defaultOrigin) return `${defaultOrigin}/api/auth/miro/callback`
  return "http://localhost:3000/api/auth/miro/callback"
}

export function getMiroAuthUrl(state: string, redirectUri: string): string {
  const clientId = requiredEnv("MIRO_CLIENT_ID")
  const scope = encodeURIComponent("boards:read team:read")

  return `${MIRO_OAUTH_AUTHORIZE}?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${encodeURIComponent(state)}`
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<MiroTokenResponse> {
  const clientId = requiredEnv("MIRO_CLIENT_ID")
  const clientSecret = requiredEnv("MIRO_CLIENT_SECRET")

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  })

  const response = await fetch(MIRO_OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Miro token exchange failed (${response.status}): ${text}`)
  }

  return (await response.json()) as MiroTokenResponse
}

export async function getMiroUser(accessToken: string): Promise<MiroUserResponse> {
  const response = await fetch(`https://api.miro.com/v1/oauth-token`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Miro user request failed (${response.status}): ${text}`)
  }

  const payload = (await response.json()) as MiroTokenContextResponse
  const user = payload.user
  const userId = user?.id

  if (typeof userId !== "string" && typeof userId !== "number") {
    throw new Error("Miro user request failed: missing user id in token context")
  }

  return {
    id: String(userId),
    name: user?.name,
    email: user?.email,
  }
}

function toStringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

function toBooleanOrUndefined(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined
}

function toNumberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined
}

function mapMiroBoard(raw: Record<string, unknown>): MiroBoard {
  const ownerObject = raw.owner as Record<string, unknown> | undefined
  const teamObject = raw.team as Record<string, unknown> | undefined
  const sharingPolicy = raw.sharingPolicy as Record<string, unknown> | undefined

  const contentHint = [
    toStringOrUndefined(raw.name),
    toStringOrUndefined(raw.description),
  ]
    .filter(Boolean)
    .join(" ")

  return {
    id: toStringOrUndefined(raw.id) ?? "unknown",
    name: toStringOrUndefined(raw.name) ?? "Untitled board",
    modifiedAt: toStringOrUndefined(raw.modifiedAt),
    owner: toStringOrUndefined(ownerObject?.email) ?? toStringOrUndefined(ownerObject?.name),
    team: toStringOrUndefined(teamObject?.name),
    editorCount: toNumberOrUndefined(raw.editorCount),
    publicAccess:
      toBooleanOrUndefined(raw.publicAccess) ??
      toStringOrUndefined(sharingPolicy?.access) === "anyone",
    anonymousAccess:
      toBooleanOrUndefined(raw.anonymousAccess) ??
      toBooleanOrUndefined(sharingPolicy?.anonymousAccess),
    contentText: contentHint,
  }
}

export async function listMiroBoards(accessToken: string, limit = 50): Promise<MiroBoard[]> {
  const boards: MiroBoard[] = []
  let cursor: string | null = null
  let guard = 0

  while (guard < 10) {
    const url = new URL(`${MIRO_BASE_URL}/boards`)
    url.searchParams.set("limit", String(limit))
    if (cursor) {
      url.searchParams.set("cursor", cursor)
    }

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Miro boards request failed (${response.status}): ${text}`)
    }

    const payload = (await response.json()) as MiroBoardsResponse
    const data = Array.isArray(payload.data) ? payload.data : []

    for (const item of data) {
      if (item && typeof item === "object") {
        boards.push(mapMiroBoard(item as Record<string, unknown>))
      }
    }

    cursor = payload.cursor ?? null
    if (!cursor) break
    guard += 1
  }

  return boards
}

export function isMiroConfigured(): boolean {
  return Boolean(process.env.MIRO_CLIENT_ID && process.env.MIRO_CLIENT_SECRET)
}
