import { NextRequest, NextResponse } from "next/server"

import { getScan } from "@/lib/server/storage"

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function GET(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params
  const scan = await getScan(id)

  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 })
  }

  return NextResponse.json(scan)
}
