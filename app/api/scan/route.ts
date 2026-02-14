import { z } from "zod"
import { NextRequest, NextResponse } from "next/server"

import { DEFAULT_SETTINGS, MIRO_SESSION_COOKIE } from "@/lib/server/constants"
import { getFallbackBoards } from "@/lib/server/fallback"
import { isMiroConfigured, listMiroBoards } from "@/lib/server/miro"
import { runScan } from "@/lib/server/scanner"
import { getMiroSession, getUserSettings, listScans, putScan, setUserSettings } from "@/lib/server/storage"

const settingsSchema = z.object({
  staleDaysThreshold: z.number().int().min(1).max(365),
  maxEditorsThreshold: z.number().int().min(1).max(1000),
  sensitiveKeywords: z.array(z.string().min(1)).max(100),
})

const scanRequestSchema = z.object({
  settings: settingsSchema.optional(),
})

function getCurrentUser(request: NextRequest): { userId: string; accessToken?: string } {
  const sessionId = request.cookies.get(MIRO_SESSION_COOKIE)?.value
  const session = getMiroSession(sessionId)

  if (session) {
    return { userId: session.userId, accessToken: session.accessToken }
  }

  return { userId: "demo-user" }
}

export async function GET(request: NextRequest) {
  const { userId } = getCurrentUser(request)
  const scans = listScans(userId).map((record) => record.summary)
  return NextResponse.json({ scans })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const parsed = scanRequestSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { userId, accessToken } = getCurrentUser(request)
  const currentSettings = getUserSettings(userId)
  const settings = {
    ...DEFAULT_SETTINGS,
    ...currentSettings,
    ...(parsed.data.settings ?? {}),
  }

  setUserSettings(userId, settings)

  let source: "miro" | "mock" = "mock"
  let warning: string | undefined
  let boards = getFallbackBoards()

  if (accessToken && isMiroConfigured()) {
    try {
      const miroBoards = await listMiroBoards(accessToken)
      if (miroBoards.length > 0) {
        boards = miroBoards
        source = "miro"
      }
    } catch (error) {
      warning = error instanceof Error ? error.message : "Failed to fetch boards from Miro"
    }
  }

  const scanRecord = runScan(userId, boards, settings)
  putScan(userId, scanRecord.summary.id, scanRecord)

  return NextResponse.json({
    source,
    warning,
    scan: scanRecord.summary,
    boards: scanRecord.boards,
    settings,
  })
}
