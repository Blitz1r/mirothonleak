import { NextRequest, NextResponse } from "next/server"

import { probeToCsv, scanToCsv } from "@/lib/server/csv"
import { getProbeSession, getScan } from "@/lib/server/storage"

interface RouteContext {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const type = request.nextUrl.searchParams.get("type")
  const id = context.params.id

  if (type === "probe") {
    const probeSession = getProbeSession(id)
    if (!probeSession) {
      return NextResponse.json({ error: "Probe session not found" }, { status: 404 })
    }

    const csv = probeToCsv(probeSession)

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=probe-${id}.csv`,
      },
    })
  }

  const scan = getScan(id)
  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 })
  }

  const csv = scanToCsv(scan)

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=scan-${id}.csv`,
    },
  })
}
