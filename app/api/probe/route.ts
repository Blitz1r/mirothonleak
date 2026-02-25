import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { probeUrls } from "@/lib/server/probe"
import { getProbeSessionForUser, isProbeRateLimited, putProbeSession } from "@/lib/server/storage"
import { applyUserCookie, getCurrentUser } from "@/lib/server/user"

const probeRequestSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(50).optional(),
  input: z.string().optional(),
})

function extractUrls(input?: string): string[] {
  if (!input) return []
  return input
    .split(/[\n,\s]+/g)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  return "unknown"
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const currentUser = await getCurrentUser(request)
  const ip = getClientIp(request)
  if (await isProbeRateLimited(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Maximum 100 probes per minute per IP." },
      { status: 429 },
    )
  }

  const payload = await request.json().catch(() => ({}))
  const parsed = probeRequestSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const urls = parsed.data.urls ?? extractUrls(parsed.data.input)

  if (urls.length === 0) {
    return NextResponse.json({ error: "No URLs provided" }, { status: 400 })
  }

  if (urls.length > 50) {
    return NextResponse.json({ error: "Maximum 50 URLs per submission" }, { status: 400 })
  }

  const { sessionId, results } = await probeUrls(urls)
  const session = {
    id: sessionId,
    userId: currentUser.userId,
    createdAt: new Date().toISOString(),
    results,
  }

  await putProbeSession(session)

  const response = NextResponse.json({
    sessionId,
    summary: {
      viewable: results.filter((item) => item.status === "viewable").length,
      protected: results.filter((item) => item.status === "protected").length,
      unreachable: results.filter((item) => item.status === "unreachable").length,
      total: results.length,
    },
    results,
  })

  applyUserCookie(response, currentUser)
  return response
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const currentUser = await getCurrentUser(request)
  const sessionId = request.nextUrl.searchParams.get("sessionId")
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 })
  }

  const session = await getProbeSessionForUser(currentUser.userId, sessionId)
  if (!session) {
    return NextResponse.json({ error: "Probe session not found" }, { status: 404 })
  }

  const response = NextResponse.json(session)
  applyUserCookie(response, currentUser)
  return response
}
