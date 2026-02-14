import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { probeUrls } from "@/lib/server/probe"
import { getProbeSession, isProbeRateLimited, putProbeSession } from "@/lib/server/storage"

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
  const ip = getClientIp(request)
  if (isProbeRateLimited(ip)) {
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
    createdAt: new Date().toISOString(),
    results,
  }

  putProbeSession(session)

  return NextResponse.json({
    sessionId,
    summary: {
      viewable: results.filter((item) => item.status === "viewable").length,
      protected: results.filter((item) => item.status === "protected").length,
      unreachable: results.filter((item) => item.status === "unreachable").length,
      total: results.length,
    },
    results,
  })
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const sessionId = request.nextUrl.searchParams.get("sessionId")
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 })
  }

  const session = getProbeSession(sessionId)
  if (!session) {
    return NextResponse.json({ error: "Probe session not found" }, { status: 404 })
  }

  return NextResponse.json(session)
}
