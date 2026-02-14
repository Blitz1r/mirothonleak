import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { DEFAULT_SETTINGS, MIRO_SESSION_COOKIE } from "@/lib/server/constants"
import { getMiroSession, getUserSettings, setUserSettings } from "@/lib/server/storage"

const settingsSchema = z.object({
  staleDaysThreshold: z.number().int().min(1).max(365),
  maxEditorsThreshold: z.number().int().min(1).max(1000),
  sensitiveKeywords: z.array(z.string().min(1)).max(100),
})

async function getCurrentUser(request: NextRequest): Promise<string> {
  const sessionId = request.cookies.get(MIRO_SESSION_COOKIE)?.value
  const session = await getMiroSession(sessionId)
  return session?.userId ?? "demo-user"
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUser(request)
  const settings = await getUserSettings(userId)

  return NextResponse.json({
    settings: {
      ...DEFAULT_SETTINGS,
      ...settings,
    },
  })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const payload = await request.json().catch(() => ({}))
  const parsed = settingsSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const userId = await getCurrentUser(request)
  const merged = {
    ...DEFAULT_SETTINGS,
    ...parsed.data,
  }

  await setUserSettings(userId, merged)

  return NextResponse.json({ settings: merged })
}
