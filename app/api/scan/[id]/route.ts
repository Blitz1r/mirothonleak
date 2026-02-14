import { NextRequest, NextResponse } from "next/server"

import { getScan } from "@/lib/server/storage"

interface RouteContext {
  params: {
    id: string
  }
}

export async function GET(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const scan = getScan(context.params.id)

  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 })
  }

  return NextResponse.json(scan)
}
