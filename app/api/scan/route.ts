import { z } from "zod"
import { NextRequest, NextResponse } from "next/server"

import { DEFAULT_SETTINGS } from "@/lib/server/constants"
import { getFallbackBoards } from "@/lib/server/fallback"
import { isMiroConfigured, listMiroBoards } from "@/lib/server/miro"
import { runScan } from "@/lib/server/scanner"
import {
  getUserSettings,
  listScanSummaries,
  putScan,
  setUserSettings,
} from "@/lib/server/storage"
import { applyUserCookie, getCurrentUser } from "@/lib/server/user"

const checkSettingSchema = z.object({
  enabled: z.boolean(),
  weight: z.number().int().min(0).max(100),
})

const settingsSchema = z.object({
  staleDaysThreshold: z.number().int().min(1).max(365),
  maxEditorsThreshold: z.number().int().min(1).max(1000),
  sensitiveKeywords: z.array(z.string().min(1)).max(100),
  riskChecks: z.object({
    public_link: checkSettingSchema,
    public_edit_access: checkSettingSchema,
    stale: checkSettingSchema,
    editors: checkSettingSchema,
    sensitive_text: checkSettingSchema,
  }),
})

const scanRequestSchema = z.object({
  settings: settingsSchema.optional(),
})

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser(request)
  const { userId } = currentUser
  const scans = await listScanSummaries(userId)
  const response = NextResponse.json({ scans })
  applyUserCookie(response, currentUser)
  return response
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const parsed = scanRequestSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const currentUser = await getCurrentUser(request)
  const { userId, accessToken } = currentUser
  const currentSettings = await getUserSettings(userId)
  const settings = {
    ...DEFAULT_SETTINGS,
    ...currentSettings,
    ...(parsed.data.settings ?? {}),
  }

  await setUserSettings(userId, settings)

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
  await putScan(userId, scanRecord.summary.id, scanRecord)

  const response = NextResponse.json({
    source,
    warning,
    scan: scanRecord.summary,
    boards: scanRecord.boards,
    settings,
  })

  applyUserCookie(response, currentUser)
  return response
}
