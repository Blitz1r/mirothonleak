import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { DEFAULT_SETTINGS } from "@/lib/server/constants"
import { getUserSettings, setUserSettings } from "@/lib/server/storage"
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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const currentUser = await getCurrentUser(request)
  const settings = await getUserSettings(currentUser.userId)

  const response = NextResponse.json({
    settings: {
      ...DEFAULT_SETTINGS,
      ...settings,
    },
  })

  applyUserCookie(response, currentUser)
  return response
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const payload = await request.json().catch(() => ({}))
  const parsed = settingsSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const currentUser = await getCurrentUser(request)
  const merged = {
    ...DEFAULT_SETTINGS,
    ...parsed.data,
  }

  await setUserSettings(currentUser.userId, merged)

  const response = NextResponse.json({ settings: merged })
  applyUserCookie(response, currentUser)
  return response
}
