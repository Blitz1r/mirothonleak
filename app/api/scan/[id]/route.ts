import { NextRequest, NextResponse } from "next/server"

import { getScanForUser } from "@/lib/server/storage"
import { applyUserCookie, getCurrentUser } from "@/lib/server/user"

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const currentUser = await getCurrentUser(request)
  const { id } = await context.params
  const scan = await getScanForUser(currentUser.userId, id)

  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 })
  }

  const response = NextResponse.json(scan)
  applyUserCookie(response, currentUser)
  return response
}
