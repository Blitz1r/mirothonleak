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

interface MiroBoardItemsResponse {
  data?: Array<Record<string, unknown>>
  cursor?: string | null
}

interface MiroBoardMembersResponse {
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

function getNestedValue(source: Record<string, unknown> | undefined, path: string[]): unknown {
  let current: unknown = source

  for (const segment of path) {
    if (!current || typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[segment]
  }

  return current
}

function normalizeText(raw: string): string {
  return raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

function looksLikeEditorRole(value: unknown): boolean {
  if (typeof value !== "string") return false
  const role = value.toLowerCase()
  return role.includes("editor") || role.includes("can_edit") || role.includes("edit")
}

function extractEditorCountFromMember(raw: Record<string, unknown>): number {
  const possibleRoleValues: unknown[] = [
    raw.role,
    raw.access,
    getNestedValue(raw, ["permissions", "role"]),
    getNestedValue(raw, ["permissions", "access"]),
  ]

  return possibleRoleValues.some((value) => looksLikeEditorRole(value)) ? 1 : 0
}

function collectTextFragments(value: unknown, depth = 0): string[] {
  if (depth > 5 || value == null) return []

  if (typeof value === "string") {
    const normalized = normalizeText(value)
    return normalized ? [normalized] : []
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectTextFragments(item, depth + 1))
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>
    const interestingKeys = ["text", "title", "content", "plainText", "value", "name"]

    const direct = interestingKeys.flatMap((key) => collectTextFragments(record[key], depth + 1))
    if (direct.length > 0) return direct

    return Object.values(record).flatMap((item) => collectTextFragments(item, depth + 1))
  }

  return []
}

function detectPublicAccess(raw: Record<string, unknown>): boolean | undefined {
  const direct = toBooleanOrUndefined(raw.publicAccess)
  if (typeof direct === "boolean") return direct

  const accessCandidates = [
    getNestedValue(raw, ["sharingPolicy", "access"]),
    getNestedValue(raw, ["sharing_policy", "access"]),
    getNestedValue(raw, ["permissionsPolicy", "access"]),
    getNestedValue(raw, ["permissionPolicy", "access"]),
    getNestedValue(raw, ["policy", "access"]),
    getNestedValue(raw, ["access"]),
  ]

  const lowered = accessCandidates
    .map((value) => (typeof value === "string" ? value.toLowerCase() : ""))
    .filter(Boolean)

  if (lowered.some((value) => value.includes("anyone") || value.includes("public"))) {
    return true
  }

  if (lowered.some((value) => value.includes("private") || value.includes("owner") || value.includes("team"))) {
    return false
  }

  return undefined
}

function detectAnonymousAccess(raw: Record<string, unknown>): boolean | undefined {
  const direct = toBooleanOrUndefined(raw.anonymousAccess)
  if (typeof direct === "boolean") return direct

  const candidates = [
    getNestedValue(raw, ["sharingPolicy", "anonymousAccess"]),
    getNestedValue(raw, ["permissionsPolicy", "anonymousAccess"]),
    getNestedValue(raw, ["policy", "anonymousAccess"]),
    getNestedValue(raw, ["anonymousAccess"]),
  ]

  for (const value of candidates) {
    if (typeof value === "boolean") return value
    if (typeof value === "string") {
      const lowered = value.toLowerCase()
      if (["true", "yes", "enabled", "on"].includes(lowered)) return true
      if (["false", "no", "disabled", "off"].includes(lowered)) return false
    }
  }

  return undefined
}

function mapMiroBoard(raw: Record<string, unknown>): MiroBoard {
  const ownerObject = raw.owner as Record<string, unknown> | undefined
  const teamObject = raw.team as Record<string, unknown> | undefined
  const contentHint = collectTextFragments([
    raw.name,
    raw.description,
    getNestedValue(raw, ["description", "content"]),
  ]).join(" ")

  return {
    id: toStringOrUndefined(raw.id) ?? "unknown",
    name: toStringOrUndefined(raw.name) ?? "Untitled board",
    modifiedAt: toStringOrUndefined(raw.modifiedAt),
    owner: toStringOrUndefined(ownerObject?.email) ?? toStringOrUndefined(ownerObject?.name),
    team: toStringOrUndefined(teamObject?.name),
    editorCount: toNumberOrUndefined(raw.editorCount),
    publicAccess: detectPublicAccess(raw),
    anonymousAccess: detectAnonymousAccess(raw),
    contentText: contentHint,
  }
}

async function fetchBoardDetails(accessToken: string, boardId: string): Promise<Record<string, unknown> | null> {
  const response = await fetch(`${MIRO_BASE_URL}/boards/${encodeURIComponent(boardId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })

  if (!response.ok) {
    return null
  }

  return (await response.json()) as Record<string, unknown>
}

async function fetchBoardItemsText(accessToken: string, boardId: string, maxPages = 2): Promise<string> {
  const textParts: string[] = []
  let cursor: string | null = null
  let page = 0

  while (page < maxPages) {
    const url = new URL(`${MIRO_BASE_URL}/boards/${encodeURIComponent(boardId)}/items`)
    url.searchParams.set("limit", "50")
    if (cursor) {
      url.searchParams.set("cursor", cursor)
    }

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    })

    if (!response.ok) {
      break
    }

    const payload = (await response.json()) as MiroBoardItemsResponse
    const data = Array.isArray(payload.data) ? payload.data : []

    for (const item of data) {
      textParts.push(...collectTextFragments(item))
    }

    cursor = payload.cursor ?? null
    if (!cursor) break
    page += 1
  }

  return textParts.join(" ")
}

async function fetchBoardEditorCount(accessToken: string, boardId: string, maxPages = 5): Promise<number | undefined> {
  let count = 0
  let foundAny = false
  let cursor: string | null = null
  let page = 0

  while (page < maxPages) {
    const url = new URL(`${MIRO_BASE_URL}/boards/${encodeURIComponent(boardId)}/members`)
    url.searchParams.set("limit", "50")
    if (cursor) {
      url.searchParams.set("cursor", cursor)
    }

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    })

    if (!response.ok) {
      break
    }

    const payload = (await response.json()) as MiroBoardMembersResponse
    const members = Array.isArray(payload.data) ? payload.data : []

    if (members.length > 0) {
      foundAny = true
    }

    for (const member of members) {
      count += extractEditorCountFromMember(member)
    }

    cursor = payload.cursor ?? null
    if (!cursor) break
    page += 1
  }

  return foundAny ? count : undefined
}

async function probePublicBoard(boardId: string): Promise<boolean | undefined> {
  try {
    const response = await fetch(`https://miro.com/api/v1/boards/${encodeURIComponent(boardId)}`, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      headers: {
        "User-Agent": "MiroSecurityPostureAnalyzer/1.0",
        Accept: "application/json",
      },
    })

    if (response.status === 200) return true
    if (response.status === 401 || response.status === 403 || response.status === 404) return false
    return undefined
  } catch {
    return undefined
  }
}

async function enrichBoard(accessToken: string, board: MiroBoard): Promise<MiroBoard> {
  const [details, itemsText, probedPublic, fetchedEditorCount] = await Promise.all([
    fetchBoardDetails(accessToken, board.id),
    fetchBoardItemsText(accessToken, board.id),
    probePublicBoard(board.id),
    fetchBoardEditorCount(accessToken, board.id),
  ])

  const detailBoard = details ? mapMiroBoard(details) : undefined

  return {
    ...board,
    ...detailBoard,
    id: board.id,
    name: detailBoard?.name ?? board.name,
    publicAccess: probedPublic ?? detailBoard?.publicAccess ?? board.publicAccess,
    anonymousAccess: detailBoard?.anonymousAccess ?? board.anonymousAccess,
    editorCount: fetchedEditorCount ?? detailBoard?.editorCount ?? board.editorCount,
    contentText: [board.contentText, detailBoard?.contentText, itemsText].filter(Boolean).join(" "),
  }
}

export async function listMiroBoards(accessToken: string, limit = 50): Promise<MiroBoard[]> {
  const baseBoards: MiroBoard[] = []
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
        baseBoards.push(mapMiroBoard(item as Record<string, unknown>))
      }
    }

    cursor = payload.cursor ?? null
    if (!cursor) break
    guard += 1
  }

  const boards: MiroBoard[] = []
  for (const board of baseBoards) {
    boards.push(await enrichBoard(accessToken, board))
  }

  return boards
}

export function isMiroConfigured(): boolean {
  return Boolean(process.env.MIRO_CLIENT_ID && process.env.MIRO_CLIENT_SECRET)
}
